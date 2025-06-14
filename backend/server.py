from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from bson import ObjectId
import discord
from discord.ext import commands, tasks
import asyncio
import json
import threading
import re

# Custom ObjectId handling for JSON serialization
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Discord Bot Configuration
DISCORD_TOKEN = os.environ.get('DISCORD_BOT_TOKEN')
DISCORD_BOT_ID = os.environ.get('DISCORD_BOT_ID')

# Bot intents and setup
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True

bot = commands.Bot(command_prefix='!', intents=intents)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class BotSettings(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    guild_id: str
    welcome_channel_id: Optional[str] = None
    log_channel_id: Optional[str] = None
    default_role_name: str = "Member"
    auto_role_enabled: bool = True
    quiet_hours_enabled: bool = True
    quiet_start: str = "22:00"
    quiet_end: str = "08:00"
    strike_limit: int = 3
    auto_timeout_enabled: bool = True
    welcome_message_ar: str = "مرحباً {mention}! أهلاً وسهلاً بك في خادمنا 🎉"
    welcome_message_en: str = "Welcome {mention}! We're glad to have you here 🎉"
    forbidden_words: List[str] = ["spam", "toxic", "inappropriate"]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Member(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    username: str
    guild_id: str
    join_date: datetime
    strike_count: int = 0
    total_messages: int = 0
    last_active: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Strike(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    guild_id: str
    reason: str
    moderator_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ModAction(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    action: str  # kick, ban, mute, timeout
    target_id: str
    moderator_id: str
    reason: str
    duration: Optional[int] = None  # minutes for timeout/mute
    guild_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ServerStats(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    guild_id: str
    total_members: int
    new_members_week: int
    total_strikes: int
    mod_actions_week: int
    messages_today: int
    active_users: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Bot Event Handlers
@bot.event
async def on_ready():
    print(f'🤖 {bot.user} (المنظِّم الذكي) متصل بديسكورد!')
    print(f'Connected to {len(bot.guilds)} servers')
    
    # Start background tasks
    check_quiet_hours.start()
    weekly_report.start()
    update_member_activity.start()
    
    # Initialize settings for all guilds
    for guild in bot.guilds:
        existing_settings = await db.bot_settings.find_one({"guild_id": str(guild.id)})
        if not existing_settings:
            settings = BotSettings(guild_id=str(guild.id))
            await db.bot_settings.insert_one(settings.dict(by_alias=True))

@bot.event
async def on_member_join(member):
    guild_id = str(member.guild.id)
    settings = await db.bot_settings.find_one({"guild_id": guild_id})
    
    if not settings:
        return
    
    # Save member to database
    member_data = Member(
        user_id=str(member.id),
        username=str(member),
        guild_id=guild_id,
        join_date=datetime.utcnow()
    )
    await db.members.insert_one(member_data.dict(by_alias=True))
    
    # Send welcome message
    welcome_channel_id = settings.get('welcome_channel_id')
    if welcome_channel_id:
        welcome_channel = bot.get_channel(int(welcome_channel_id))
        if welcome_channel:
            # Create welcome embed
            embed = discord.Embed(
                title="مرحباً! Welcome!",
                description=f"{settings['welcome_message_ar']}\n{settings['welcome_message_en']}".format(mention=member.mention),
                color=0x00ff00,
                timestamp=datetime.utcnow()
            )
            embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)
            embed.add_field(name="Member Count", value=f"#{len(member.guild.members)}", inline=True)
            
            await welcome_channel.send(embed=embed)
    
    # Auto-assign default role
    if settings.get('auto_role_enabled', True):
        default_role = discord.utils.get(member.guild.roles, name=settings.get('default_role_name', 'Member'))
        if default_role:
            try:
                await member.add_roles(default_role)
            except discord.Forbidden:
                print(f"Cannot assign role to {member}")

@bot.event
async def on_message(message):
    if message.author.bot:
        return
    
    guild_id = str(message.guild.id) if message.guild else None
    if not guild_id:
        return
    
    # Update member activity
    await db.members.update_one(
        {"user_id": str(message.author.id), "guild_id": guild_id},
        {
            "$inc": {"total_messages": 1},
            "$set": {"last_active": datetime.utcnow()}
        },
        upsert=True
    )
    
    # Auto moderation
    settings = await db.bot_settings.find_one({"guild_id": guild_id})
    if settings and settings.get('forbidden_words'):
        content_lower = message.content.lower()
        if any(word in content_lower for word in settings['forbidden_words']):
            await message.delete()
            
            # Add strike
            strike = Strike(
                user_id=str(message.author.id),
                guild_id=guild_id,
                reason="Inappropriate language",
                moderator_id=str(bot.user.id)
            )
            await db.strikes.insert_one(strike.dict(by_alias=True))
            
            # Update member strike count
            member_doc = await db.members.find_one({
                "user_id": str(message.author.id),
                "guild_id": guild_id
            })
            
            if member_doc:
                new_strike_count = member_doc.get('strike_count', 0) + 1
                await db.members.update_one(
                    {"user_id": str(message.author.id), "guild_id": guild_id},
                    {"$set": {"strike_count": new_strike_count}}
                )
                
                # Progressive punishment
                strike_limit = settings.get('strike_limit', 3)
                if new_strike_count >= strike_limit and settings.get('auto_timeout_enabled', True):
                    try:
                        await message.author.timeout(timedelta(hours=1), reason=f"{strike_limit} strikes - auto timeout")
                        await message.channel.send(
                            f"⚠️ {message.author.mention} تم كتمك لمدة ساعة ({strike_limit} إنذارات)\n"
                            f"You have been timed out for 1 hour ({strike_limit} strikes)"
                        )
                        
                        # Log moderation action
                        mod_action = ModAction(
                            action="timeout",
                            target_id=str(message.author.id),
                            moderator_id=str(bot.user.id),
                            reason=f"Auto-timeout: {strike_limit} strikes",
                            duration=60,
                            guild_id=guild_id
                        )
                        await db.mod_actions.insert_one(mod_action.dict(by_alias=True))
                        
                    except discord.Forbidden:
                        print(f"Cannot timeout {message.author}")
                else:
                    await message.channel.send(
                        f"⚠️ {message.author.mention} إنذار ({new_strike_count}/{strike_limit})\n"
                        f"Strike ({new_strike_count}/{strike_limit})"
                    )
    
    await bot.process_commands(message)

# Bot Commands
@bot.command(name='طرد', aliases=['kick'])
@commands.has_permissions(kick_members=True)
async def kick_member(ctx, member: discord.Member, *, reason="لا يوجد سبب / No reason provided"):
    try:
        await member.kick(reason=reason)
        
        embed = discord.Embed(
            title="تم طرد العضو / Member Kicked",
            description=f"{member.mention} تم طرده من الخادم\n{member.mention} has been kicked",
            color=0xff9900
        )
        embed.add_field(name="السبب / Reason", value=reason, inline=False)
        embed.add_field(name="المشرف / Moderator", value=ctx.author.mention, inline=True)
        
        await ctx.send(embed=embed)
        
        # Log action
        mod_action = ModAction(
            action="kick",
            target_id=str(member.id),
            moderator_id=str(ctx.author.id),
            reason=reason,
            guild_id=str(ctx.guild.id)
        )
        await db.mod_actions.insert_one(mod_action.dict(by_alias=True))
        
    except discord.Forbidden:
        await ctx.send("❌ ليس لدي صلاحية لطرد هذا العضو / I don't have permission to kick this member")

@bot.command(name='كتم', aliases=['mute'])
@commands.has_permissions(moderate_members=True)
async def mute_member(ctx, member: discord.Member, duration: int = 60, *, reason="لا يوجد سبب / No reason provided"):
    try:
        await member.timeout(timedelta(minutes=duration), reason=reason)
        
        embed = discord.Embed(
            title="تم كتم العضو / Member Muted",
            description=f"{member.mention} تم كتمه لمدة {duration} دقيقة\n{member.mention} has been muted for {duration} minutes",
            color=0xff0000
        )
        embed.add_field(name="السبب / Reason", value=reason, inline=False)
        embed.add_field(name="المشرف / Moderator", value=ctx.author.mention, inline=True)
        
        await ctx.send(embed=embed)
        
        # Log action
        mod_action = ModAction(
            action="timeout",
            target_id=str(member.id),
            moderator_id=str(ctx.author.id),
            reason=reason,
            duration=duration,
            guild_id=str(ctx.guild.id)
        )
        await db.mod_actions.insert_one(mod_action.dict(by_alias=True))
        
    except discord.Forbidden:
        await ctx.send("❌ ليس لدي صلاحية لكتم هذا العضو / I don't have permission to mute this member")

@bot.command(name='مسح', aliases=['purge'])
@commands.has_permissions(manage_messages=True)
async def purge_messages(ctx, amount: int):
    if amount > 100:
        await ctx.send("❌ لا يمكن حذف أكثر من 100 رسالة / Cannot delete more than 100 messages at once")
        return
    
    try:
        deleted = await ctx.channel.purge(limit=amount + 1)
        await ctx.send(f"✅ تم حذف {len(deleted) - 1} رسالة / Deleted {len(deleted) - 1} messages", delete_after=5)
        
        # Log action
        mod_action = ModAction(
            action="purge",
            target_id=str(ctx.channel.id),
            moderator_id=str(ctx.author.id),
            reason=f"Purged {len(deleted) - 1} messages",
            guild_id=str(ctx.guild.id)
        )
        await db.mod_actions.insert_one(mod_action.dict(by_alias=True))
        
    except discord.Forbidden:
        await ctx.send("❌ ليس لدي صلاحية لحذف الرسائل / I don't have permission to delete messages")

@bot.command(name='الأدوار', aliases=['roles'])
async def role_menu(ctx):
    embed = discord.Embed(
        title="🎭 اختيار الأدوار / Role Selection",
        description="استخدم الأزرار أدناه لاختيار أدوارك\nUse the buttons below to select your roles",
        color=0x0099ff
    )
    
    view = RoleView()
    await ctx.send(embed=embed, view=view)

@bot.command(name='الإحصائيات', aliases=['stats'])
async def server_stats(ctx):
    guild_id = str(ctx.guild.id)
    
    # Get statistics
    total_members = len(ctx.guild.members)
    
    # Get new members in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_members = await db.members.count_documents({
        "guild_id": guild_id,
        "join_date": {"$gte": week_ago}
    })
    
    # Get total strikes
    total_strikes = await db.strikes.count_documents({"guild_id": guild_id})
    
    # Get mod actions this week
    mod_actions = await db.mod_actions.count_documents({
        "guild_id": guild_id,
        "timestamp": {"$gte": week_ago}
    })
    
    embed = discord.Embed(
        title="📊 إحصائيات الخادم / Server Statistics",
        color=0x00ff00,
        timestamp=datetime.utcnow()
    )
    
    embed.add_field(name="إجمالي الأعضاء / Total Members", value=total_members, inline=True)
    embed.add_field(name="أعضاء جدد (7 أيام) / New Members (7d)", value=new_members, inline=True)
    embed.add_field(name="إجمالي الإنذارات / Total Strikes", value=total_strikes, inline=True)
    embed.add_field(name="إجراءات الإشراف (7 أيام) / Mod Actions (7d)", value=mod_actions, inline=True)
    
    await ctx.send(embed=embed)

# Role Selection UI
class RoleView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=300)
    
    @discord.ui.select(
        placeholder="اختر دورك / Choose your role",
        options=[
            discord.SelectOption(label="🎮 Gamer", description="للاعبين / For gaming enthusiasts", value="Gamer"),
            discord.SelectOption(label="🎨 Artist", description="للمبدعين / For creative minds", value="Artist"),
            discord.SelectOption(label="💻 Developer", description="للمطورين / For programmers", value="Developer"),
            discord.SelectOption(label="📚 Student", description="للطلاب / For learners", value="Student"),
            discord.SelectOption(label="🎵 Music Lover", description="لعشاق الموسيقى / For music lovers", value="Music Lover"),
        ]
    )
    async def role_select(self, interaction: discord.Interaction, select: discord.ui.Select):
        role_name = select.values[0]
        role = discord.utils.get(interaction.guild.roles, name=role_name)
        
        if not role:
            # Create role if it doesn't exist
            try:
                role = await interaction.guild.create_role(name=role_name, mentionable=True)
            except discord.Forbidden:
                await interaction.response.send_message("❌ لا يمكنني إنشاء الأدوار / Cannot create roles", ephemeral=True)
                return
        
        try:
            if role in interaction.user.roles:
                await interaction.user.remove_roles(role)
                await interaction.response.send_message(f"❌ تم إزالة دور: {role_name}", ephemeral=True)
            else:
                await interaction.user.add_roles(role)
                await interaction.response.send_message(f"✅ تم إضافة دور: {role_name}", ephemeral=True)
        except discord.Forbidden:
            await interaction.response.send_message("❌ لا يمكنني تعديل أدوارك / Cannot modify your roles", ephemeral=True)

# Background Tasks
@tasks.loop(minutes=1)
async def check_quiet_hours():
    current_time = datetime.now().time()
    
    for guild in bot.guilds:
        guild_id = str(guild.id)
        settings = await db.bot_settings.find_one({"guild_id": guild_id})
        
        if not settings or not settings.get('quiet_hours_enabled', True):
            continue
        
        quiet_start = datetime.strptime(settings.get('quiet_start', '22:00'), "%H:%M").time()
        quiet_end = datetime.strptime(settings.get('quiet_end', '08:00'), "%H:%M").time()
        
        is_quiet_time = current_time >= quiet_start or current_time <= quiet_end
        
        # Get general channel
        general_channel = discord.utils.get(guild.text_channels, name="general")
        if not general_channel and guild.text_channels:
            general_channel = guild.text_channels[0]
        
        if general_channel:
            overwrites = general_channel.overwrites_for(guild.default_role)
            
            if is_quiet_time and overwrites.send_messages is not False:
                overwrites.send_messages = False
                await general_channel.set_permissions(guild.default_role, overwrite=overwrites)
                
                embed = discord.Embed(
                    title="🌙 ساعات الهدوء / Quiet Hours",
                    description="تم تفعيل ساعات الهدوء\nQuiet hours are now active",
                    color=0x000080
                )
                await general_channel.send(embed=embed)
                
            elif not is_quiet_time and overwrites.send_messages is False:
                overwrites.send_messages = None
                await general_channel.set_permissions(guild.default_role, overwrite=overwrites)
                
                embed = discord.Embed(
                    title="☀️ انتهاء ساعات الهدوء / Quiet Hours Ended",
                    description="انتهت ساعات الهدوء، يمكنكم التحدث الآن\nQuiet hours have ended, you can chat now",
                    color=0xffff00
                )
                await general_channel.send(embed=embed)

@tasks.loop(hours=168)  # Weekly
async def weekly_report():
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    for guild in bot.guilds:
        guild_id = str(guild.id)
        settings = await db.bot_settings.find_one({"guild_id": guild_id})
        
        if not settings or not settings.get('log_channel_id'):
            continue
        
        log_channel = bot.get_channel(int(settings['log_channel_id']))
        if not log_channel:
            continue
        
        # Gather statistics
        new_members = await db.members.count_documents({
            'guild_id': guild_id,
            'join_date': {'$gte': start_date, '$lte': end_date}
        })
        
        total_strikes = await db.strikes.count_documents({
            'guild_id': guild_id,
            'timestamp': {'$gte': start_date, '$lte': end_date}
        })
        
        mod_actions = await db.mod_actions.count_documents({
            'guild_id': guild_id,
            'timestamp': {'$gte': start_date, '$lte': end_date}
        })
        
        # Create report embed
        embed = discord.Embed(
            title="📊 التقرير الأسبوعي / Weekly Report",
            description=f"تقرير من {start_date.strftime('%Y-%m-%d')} إلى {end_date.strftime('%Y-%m-%d')}\nReport from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            color=0x00ff00,
            timestamp=datetime.utcnow()
        )
        
        embed.add_field(name="أعضاء جدد / New Members", value=new_members, inline=True)
        embed.add_field(name="إجمالي الإنذارات / Total Strikes", value=total_strikes, inline=True)
        embed.add_field(name="إجراءات الإشراف / Mod Actions", value=mod_actions, inline=True)
        embed.add_field(name="إجمالي الأعضاء / Total Members", value=len(guild.members), inline=True)
        
        await log_channel.send(embed=embed)

@tasks.loop(hours=1)
async def update_member_activity():
    """Update member activity and auto-assign roles based on activity"""
    for guild in bot.guilds:
        guild_id = str(guild.id)
        settings = await db.bot_settings.find_one({"guild_id": guild_id})
        
        if not settings or not settings.get('auto_role_enabled', True):
            continue
        
        # Get members who joined more than 7 days ago and have been active
        week_ago = datetime.utcnow() - timedelta(days=7)
        active_members = await db.members.find({
            "guild_id": guild_id,
            "join_date": {"$lte": week_ago},
            "total_messages": {"$gte": 10},
            "strike_count": {"$lt": 3}
        }).to_list(length=None)
        
        # Auto-assign "Active Member" role
        active_role = discord.utils.get(guild.roles, name="Active Member")
        if not active_role:
            try:
                active_role = await guild.create_role(
                    name="Active Member",
                    color=discord.Color.green(),
                    mentionable=True
                )
            except discord.Forbidden:
                continue
        
        for member_doc in active_members:
            try:
                member = guild.get_member(int(member_doc['user_id']))
                if member and active_role not in member.roles:
                    await member.add_roles(active_role)
            except (discord.Forbidden, discord.NotFound):
                continue

# Error handling
@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        embed = discord.Embed(
            title="❌ خطأ في الصلاحيات / Permission Error",
            description="ليس لديك الصلاحية لاستخدام هذا الأمر\nYou don't have permission to use this command",
            color=0xff0000
        )
        await ctx.send(embed=embed)
    elif isinstance(error, commands.MemberNotFound):
        await ctx.send("❌ لم يتم العثور على العضو / Member not found")
    elif isinstance(error, commands.CommandOnCooldown):
        await ctx.send(f"⏰ الأمر في فترة انتظار / Command on cooldown: {error.retry_after:.2f}s")
    else:
        print(f"Bot error: {error}")

# API Endpoints
@api_router.get("/bot/status")
async def get_bot_status():
    if not bot.is_ready():
        return {"status": "connecting", "guilds": 0, "users": 0}
    
    return {
        "status": "online",
        "guilds": len(bot.guilds),
        "users": len(bot.users),
        "latency": round(bot.latency * 1000, 2)
    }

@api_router.get("/bot/guilds")
async def get_bot_guilds():
    if not bot.is_ready():
        return []
    
    guilds = []
    for guild in bot.guilds:
        guilds.append({
            "id": str(guild.id),
            "name": guild.name,
            "member_count": len(guild.members),
            "icon": str(guild.icon.url) if guild.icon else None
        })
    
    return guilds

@api_router.get("/bot/settings/{guild_id}")
async def get_bot_settings(guild_id: str):
    settings = await db.bot_settings.find_one({"guild_id": guild_id})
    if not settings:
        # Create default settings if none exist
        default_settings = BotSettings(guild_id=guild_id)
        await db.bot_settings.insert_one(default_settings.dict(by_alias=True))
        settings = default_settings.dict(by_alias=True)
    
    return jsonable_encoder(settings)

@api_router.put("/bot/settings/{guild_id}")
async def update_bot_settings(guild_id: str, settings: Dict[str, Any]):
    result = await db.bot_settings.update_one(
        {"guild_id": guild_id},
        {"$set": settings},
        upsert=True
    )
    
    if result.matched_count == 0 and result.upserted_id is None:
        raise HTTPException(status_code=404, detail="Failed to update settings")
    
    return {"message": "Settings updated successfully"}

@api_router.get("/bot/stats/{guild_id}")
async def get_guild_stats(guild_id: str):
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    total_members = await db.members.count_documents({"guild_id": guild_id})
    new_members = await db.members.count_documents({
        "guild_id": guild_id,
        "join_date": {"$gte": week_ago}
    })
    total_strikes = await db.strikes.count_documents({"guild_id": guild_id})
    mod_actions = await db.mod_actions.count_documents({
        "guild_id": guild_id,
        "timestamp": {"$gte": week_ago}
    })
    
    return {
        "total_members": total_members,
        "new_members_week": new_members,
        "total_strikes": total_strikes,
        "mod_actions_week": mod_actions,
        "timestamp": datetime.utcnow()
    }

@api_router.get("/bot/members/{guild_id}")
async def get_guild_members(guild_id: str, skip: int = 0, limit: int = 50):
    members = await db.members.find({"guild_id": guild_id}).skip(skip).limit(limit).to_list(length=limit)
    return jsonable_encoder(members)

@api_router.get("/bot/strikes/{guild_id}")
async def get_guild_strikes(guild_id: str, skip: int = 0, limit: int = 50):
    strikes = await db.strikes.find({"guild_id": guild_id}).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    return jsonable_encoder(strikes)

@api_router.get("/bot/actions/{guild_id}")
async def get_mod_actions(guild_id: str, skip: int = 0, limit: int = 50):
    actions = await db.mod_actions.find({"guild_id": guild_id}).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    return jsonable_encoder(actions)

# Start Discord Bot in separate thread
def start_discord_bot():
    asyncio.set_event_loop(asyncio.new_event_loop())
    loop = asyncio.get_event_loop()
    
    if DISCORD_TOKEN:
        try:
            loop.run_until_complete(bot.start(DISCORD_TOKEN))
        except Exception as e:
            print(f"Failed to start Discord bot: {e}")
    else:
        print("Discord token not provided")

# Discord bot startup
discord_bot_task = None

@app.on_event("startup")
async def startup_event():
    global discord_bot_task
    if DISCORD_TOKEN and not discord_bot_task:
        # Start bot in background
        bot_thread = threading.Thread(target=start_discord_bot, daemon=True)
        bot_thread.start()
        print("Discord bot started in background thread")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
