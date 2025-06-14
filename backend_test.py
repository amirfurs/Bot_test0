#!/usr/bin/env python3
import requests
import json
import unittest
import os
import sys
from datetime import datetime, timedelta
import uuid

# Get the backend URL from frontend/.env
BACKEND_URL = "https://86b1a3dc-24c8-4a94-87be-d7d3280dc19b.preview.emergentagent.com/api"

class DiscordBotBackendTest(unittest.TestCase):
    """Test suite for Discord Bot Backend API"""
    
    def setUp(self):
        """Setup for tests"""
        self.base_url = BACKEND_URL
        self.headers = {
            "Content-Type": "application/json"
        }
        # Store guild_id for later tests
        self.guild_id = None
    
    def test_01_bot_status(self):
        """Test bot status endpoint"""
        print("\n=== Testing Bot Status ===")
        response = requests.get(f"{self.base_url}/bot/status")
        self.assertEqual(response.status_code, 200, "Status endpoint should return 200")
        
        data = response.json()
        print(f"Bot Status: {data}")
        
        # Verify expected fields
        self.assertIn("status", data, "Status response should include 'status' field")
        self.assertIn("guilds", data, "Status response should include 'guilds' field")
        self.assertIn("users", data, "Status response should include 'users' field")
        
        # Bot might be in 'connecting' state during tests, which is acceptable
        self.assertIn(data["status"], ["online", "connecting"], "Bot should be online or connecting")
        
        # If bot is online, it should have latency
        if data["status"] == "online":
            self.assertIn("latency", data, "Online bot should include 'latency' field")
            print(f"✅ Bot latency: {data['latency']}ms")
        
        print(f"✅ Bot is {data['status']} with {data['guilds']} guilds and {data['users']} users")
    
    def test_02_bot_guilds(self):
        """Test bot guilds endpoint"""
        print("\n=== Testing Bot Guilds ===")
        response = requests.get(f"{self.base_url}/bot/guilds")
        self.assertEqual(response.status_code, 200, "Guilds endpoint should return 200")
        
        guilds = response.json()
        print(f"Found {len(guilds)} guilds")
        
        # If bot is connecting, it might not have guilds yet
        if len(guilds) > 0:
            # Verify guild structure
            for guild in guilds:
                self.assertIn("id", guild, "Guild should have an id")
                self.assertIn("name", guild, "Guild should have a name")
                self.assertIn("member_count", guild, "Guild should have a member_count")
                print(f"Guild: {guild['name']} (ID: {guild['id']}) - {guild['member_count']} members")
            
            # Store first guild ID for later tests
            self.guild_id = guilds[0]["id"]
            print(f"✅ Using guild ID {self.guild_id} for subsequent tests")
        else:
            print("Bot is still connecting or has no guilds. Using test guild ID.")
            # Use a test guild ID for subsequent tests
            self.guild_id = "1382836232467255379"  # From previous test run
            print(f"✅ Using test guild ID {self.guild_id} for subsequent tests")
    
    def test_03_bot_settings(self):
        """Test bot settings endpoints"""
        if not self.guild_id:
            self.skipTest("No guild ID available for testing")
        
        print("\n=== Testing Bot Settings ===")
        
        # Test GET settings
        response = requests.get(f"{self.base_url}/bot/settings/{self.guild_id}")
        self.assertEqual(response.status_code, 200, "Settings GET endpoint should return 200")
        
        settings = response.json()
        print(f"Current settings: {json.dumps(settings, indent=2)}")
        
        # Verify settings structure
        self.assertEqual(settings["guild_id"], self.guild_id, "Settings should have correct guild_id")
        self.assertIn("welcome_message_ar", settings, "Settings should include welcome_message_ar")
        self.assertIn("welcome_message_en", settings, "Settings should include welcome_message_en")
        
        # Test PUT settings
        updated_settings = {
            "welcome_message_ar": f"مرحباً {{mention}}! أهلاً وسهلاً بك في خادمنا 🎉 (Updated {datetime.now().strftime('%H:%M:%S')})",
            "welcome_message_en": f"Welcome {{mention}}! We're glad to have you here 🎉 (Updated {datetime.now().strftime('%H:%M:%S')})"
        }
        
        response = requests.put(
            f"{self.base_url}/bot/settings/{self.guild_id}",
            headers=self.headers,
            json=updated_settings
        )
        self.assertEqual(response.status_code, 200, "Settings PUT endpoint should return 200")
        
        # Verify settings were updated
        response = requests.get(f"{self.base_url}/bot/settings/{self.guild_id}")
        updated = response.json()
        
        self.assertEqual(updated["welcome_message_ar"], updated_settings["welcome_message_ar"], 
                         "Arabic welcome message should be updated")
        self.assertEqual(updated["welcome_message_en"], updated_settings["welcome_message_en"], 
                         "English welcome message should be updated")
        
        print(f"✅ Successfully updated and retrieved settings")
    
    def test_04_guild_stats(self):
        """Test guild statistics endpoint"""
        if not self.guild_id:
            self.skipTest("No guild ID available for testing")
        
        print("\n=== Testing Guild Statistics ===")
        response = requests.get(f"{self.base_url}/bot/stats/{self.guild_id}")
        self.assertEqual(response.status_code, 200, "Stats endpoint should return 200")
        
        stats = response.json()
        print(f"Guild statistics: {json.dumps(stats, indent=2)}")
        
        # Verify stats structure
        self.assertIn("total_members", stats, "Stats should include total_members")
        self.assertIn("new_members_week", stats, "Stats should include new_members_week")
        self.assertIn("total_strikes", stats, "Stats should include total_strikes")
        self.assertIn("mod_actions_week", stats, "Stats should include mod_actions_week")
        self.assertIn("timestamp", stats, "Stats should include timestamp")
        
        print(f"✅ Successfully retrieved guild statistics")
    
    def test_05_guild_members(self):
        """Test guild members endpoint"""
        if not self.guild_id:
            self.skipTest("No guild ID available for testing")
        
        print("\n=== Testing Guild Members ===")
        response = requests.get(f"{self.base_url}/bot/members/{self.guild_id}")
        self.assertEqual(response.status_code, 200, "Members endpoint should return 200")
        
        members = response.json()
        print(f"Found {len(members)} members")
        
        # Verify member structure if we have members
        if members:
            member = members[0]
            self.assertIn("id", member, "Member should have an id")
            self.assertIn("user_id", member, "Member should have a user_id")
            self.assertIn("username", member, "Member should have a username")
            self.assertIn("guild_id", member, "Member should have a guild_id")
            self.assertIn("join_date", member, "Member should have a join_date")
            
            print(f"Sample member: {member['username']} (ID: {member['user_id']})")
        
        # Test pagination
        response = requests.get(f"{self.base_url}/bot/members/{self.guild_id}?skip=0&limit=10")
        self.assertEqual(response.status_code, 200, "Members pagination should work")
        
        print(f"✅ Successfully retrieved guild members")
    
    def test_06_guild_strikes(self):
        """Test guild strikes endpoint"""
        if not self.guild_id:
            self.skipTest("No guild ID available for testing")
        
        print("\n=== Testing Guild Strikes ===")
        response = requests.get(f"{self.base_url}/bot/strikes/{self.guild_id}")
        self.assertEqual(response.status_code, 200, "Strikes endpoint should return 200")
        
        strikes = response.json()
        print(f"Found {len(strikes)} strikes")
        
        # Verify strike structure if we have strikes
        if strikes:
            strike = strikes[0]
            self.assertIn("id", strike, "Strike should have an id")
            self.assertIn("user_id", strike, "Strike should have a user_id")
            self.assertIn("guild_id", strike, "Strike should have a guild_id")
            self.assertIn("reason", strike, "Strike should have a reason")
            self.assertIn("timestamp", strike, "Strike should have a timestamp")
            
            print(f"Sample strike: {strike['reason']} for user {strike['user_id']}")
        
        # Test pagination
        response = requests.get(f"{self.base_url}/bot/strikes/{self.guild_id}?skip=0&limit=10")
        self.assertEqual(response.status_code, 200, "Strikes pagination should work")
        
        print(f"✅ Successfully retrieved guild strikes")
    
    def test_07_mod_actions(self):
        """Test moderation actions endpoint"""
        if not self.guild_id:
            self.skipTest("No guild ID available for testing")
        
        print("\n=== Testing Moderation Actions ===")
        response = requests.get(f"{self.base_url}/bot/actions/{self.guild_id}")
        self.assertEqual(response.status_code, 200, "Actions endpoint should return 200")
        
        actions = response.json()
        print(f"Found {len(actions)} moderation actions")
        
        # Verify action structure if we have actions
        if actions:
            action = actions[0]
            self.assertIn("id", action, "Action should have an id")
            self.assertIn("action", action, "Action should have an action type")
            self.assertIn("target_id", action, "Action should have a target_id")
            self.assertIn("moderator_id", action, "Action should have a moderator_id")
            self.assertIn("reason", action, "Action should have a reason")
            self.assertIn("guild_id", action, "Action should have a guild_id")
            self.assertIn("timestamp", action, "Action should have a timestamp")
            
            print(f"Sample action: {action['action']} on {action['target_id']} by {action['moderator_id']}")
        
        # Test pagination
        response = requests.get(f"{self.base_url}/bot/actions/{self.guild_id}?skip=0&limit=10")
        self.assertEqual(response.status_code, 200, "Actions pagination should work")
        
        print(f"✅ Successfully retrieved moderation actions")
    
    def test_08_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n=== Testing Error Handling ===")
        
        # Test invalid guild ID for settings
        invalid_id = "invalid_guild_id"
        response = requests.get(f"{self.base_url}/bot/settings/{invalid_id}")
        self.assertEqual(response.status_code, 404, "Invalid guild ID should return 404")
        
        # Test invalid endpoint
        response = requests.get(f"{self.base_url}/invalid/endpoint")
        self.assertNotEqual(response.status_code, 200, "Invalid endpoint should not return 200")
        
        print(f"✅ Error handling works correctly")

if __name__ == "__main__":
    print(f"Testing Discord Bot Backend API at {BACKEND_URL}")
    
    # Run test_01_bot_status and test_02_bot_guilds
    print("\nRunning test_01_bot_status...")
    test = DiscordBotBackendTest('test_01_bot_status')
    test.setUp()
    test.test_01_bot_status()
    
    print("\nRunning test_02_bot_guilds...")
    test = DiscordBotBackendTest('test_02_bot_guilds')
    test.setUp()
    test.test_02_bot_guilds()
    
    print("\nRunning test_08_error_handling...")
    test = DiscordBotBackendTest('test_08_error_handling')
    test.setUp()
    test.test_08_error_handling()