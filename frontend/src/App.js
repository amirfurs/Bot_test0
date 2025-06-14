import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [botStatus, setBotStatus] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [guildStats, setGuildStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [strikes, setStrikes] = useState([]);
  const [modActions, setModActions] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBotStatus();
    fetchGuilds();
  }, []);

  useEffect(() => {
    if (selectedGuild) {
      fetchGuildData();
    }
  }, [selectedGuild]);

  const fetchBotStatus = async () => {
    try {
      const response = await axios.get(`${API}/bot/status`);
      setBotStatus(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching bot status:', error);
      setError('فشل في الاتصال بالبوت / Failed to connect to bot');
    }
  };

  const fetchGuilds = async () => {
    try {
      const response = await axios.get(`${API}/bot/guilds`);
      setGuilds(response.data);
      if (response.data.length > 0) {
        setSelectedGuild(response.data[0]);
      }
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Error fetching guilds:', error);
      setError('فشل في جلب قائمة الخوادم / Failed to fetch servers');
      setLoading(false);
    }
  };

  const fetchGuildData = async () => {
    if (!selectedGuild) return;

    try {
      const [statsRes, settingsRes, strikesRes, actionsRes] = await Promise.all([
        axios.get(`${API}/bot/stats/${selectedGuild.id}`),
        axios.get(`${API}/bot/settings/${selectedGuild.id}`),
        axios.get(`${API}/bot/strikes/${selectedGuild.id}`),
        axios.get(`${API}/bot/actions/${selectedGuild.id}`)
      ]);

      setGuildStats(statsRes.data);
      setSettings(settingsRes.data);
      setStrikes(strikesRes.data);
      setModActions(actionsRes.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching guild data:', error);
      setError('فشل في جلب بيانات الخادم / Failed to fetch server data');
    }
  };

  const updateSettings = async (newSettings) => {
    if (!selectedGuild) return;

    try {
      await axios.put(`${API}/bot/settings/${selectedGuild.id}`, newSettings);
      setSettings({ ...settings, ...newSettings });
      setError(null);
      // Show success message
      alert('✅ تم تحديث الإعدادات بنجاح / Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('فشل في تحديث الإعدادات / Failed to update settings');
      alert('❌ فشل في تحديث الإعدادات / Failed to update settings');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const refreshData = async () => {
    setLoading(true);
    await fetchBotStatus();
    await fetchGuilds();
    if (selectedGuild) {
      await fetchGuildData();
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mx-auto mb-4"></div>
          <div className="text-white text-2xl font-bold">🤖 جاري تحميل البوت...</div>
          <div className="text-blue-200 text-lg">Loading SmartModerator...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Enhanced Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-white/20 shadow-2xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 rtl:space-x-reverse">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-xl">
                <span className="text-3xl">🤖</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">المنظِّم الذكي</h1>
                <p className="text-blue-200 text-lg">SmartModerator Dashboard</p>
                {selectedGuild && (
                  <p className="text-purple-300 text-sm">خادم: {selectedGuild.name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-6 rtl:space-x-reverse">
              {/* Refresh Button */}
              <button
                onClick={refreshData}
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all duration-200 shadow-lg"
                title="تحديث البيانات / Refresh Data"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Bot Status */}
              {botStatus && (
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className={`w-4 h-4 rounded-full animate-pulse ${botStatus.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-white font-medium">
                      {botStatus.status === 'online' ? 'متصل' : 'غير متصل'}
                    </span>
                    <span className="text-blue-200 text-sm">
                      {botStatus.guilds} خادم | {botStatus.users} مستخدم
                    </span>
                  </div>
                </div>
              )}
              
              {/* Server Selector */}
              {selectedGuild && guilds.length > 1 && (
                <select 
                  value={selectedGuild.id} 
                  onChange={(e) => setSelectedGuild(guilds.find(g => g.id === e.target.value))}
                  className="bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
                >
                  {guilds.map(guild => (
                    <option key={guild.id} value={guild.id} className="bg-gray-800 text-white">
                      {guild.name} ({guild.member_count} أعضاء)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="container mx-auto px-6 py-4">
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-4 rounded-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8">
        {/* Enhanced Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-2 rtl:space-x-reverse bg-black/30 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
            {[
              { id: 'dashboard', name: 'لوحة القيادة', icon: '📊', desc: 'Dashboard' },
              { id: 'settings', name: 'الإعدادات', icon: '⚙️', desc: 'Settings' },
              { id: 'moderation', name: 'الإشراف', icon: '🛡️', desc: 'Moderation' },
              { id: 'reports', name: 'التقارير', icon: '📈', desc: 'Reports' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 rtl:space-x-reverse px-8 py-4 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105' 
                    : 'text-blue-100 hover:bg-white/10 hover:scale-102'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-bold">{tab.name}</div>
                  <div className="text-xs opacity-75">{tab.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Enhanced Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Server Info Card */}
            {selectedGuild && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    {selectedGuild.icon && (
                      <img 
                        src={selectedGuild.icon} 
                        alt={selectedGuild.name}
                        className="w-16 h-16 rounded-full border-4 border-white/20"
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedGuild.name}</h2>
                      <p className="text-blue-200">معرف الخادم: {selectedGuild.id}</p>
                      <p className="text-purple-300">{selectedGuild.member_count} عضو في الخادم</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 text-3xl font-bold">✅</div>
                    <p className="text-green-300 font-medium">متصل وجاهز</p>
                    <p className="text-blue-200 text-sm">Connected & Ready</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Stats Cards */}
            {guildStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-400/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-blue-500/30 rounded-full flex items-center justify-center">
                      <span className="text-3xl">👥</span>
                    </div>
                    <div className="text-blue-400 text-sm font-medium bg-blue-500/20 px-3 py-1 rounded-full">
                      إجمالي
                    </div>
                  </div>
                  <p className="text-blue-200 text-sm mb-2">إجمالي الأعضاء</p>
                  <p className="text-4xl font-bold text-white mb-1">{guildStats.total_members}</p>
                  <p className="text-blue-300 text-sm">Total Members</p>
                </div>

                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-green-500/30 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🆕</span>
                    </div>
                    <div className="text-green-400 text-sm font-medium bg-green-500/20 px-3 py-1 rounded-full">
                      7 أيام
                    </div>
                  </div>
                  <p className="text-green-200 text-sm mb-2">أعضاء جدد</p>
                  <p className="text-4xl font-bold text-white mb-1">{guildStats.new_members_week}</p>
                  <p className="text-green-300 text-sm">New Members (7d)</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-yellow-500/30 rounded-full flex items-center justify-center">
                      <span className="text-3xl">⚠️</span>
                    </div>
                    <div className="text-yellow-400 text-sm font-medium bg-yellow-500/20 px-3 py-1 rounded-full">
                      إنذارات
                    </div>
                  </div>
                  <p className="text-yellow-200 text-sm mb-2">إجمالي الإنذارات</p>
                  <p className="text-4xl font-bold text-white mb-1">{guildStats.total_strikes}</p>
                  <p className="text-yellow-300 text-sm">Total Strikes</p>
                </div>

                <div className="bg-gradient-to-br from-red-500/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-8 border border-red-400/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-red-500/30 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🛡️</span>
                    </div>
                    <div className="text-red-400 text-sm font-medium bg-red-500/20 px-3 py-1 rounded-full">
                      7 أيام
                    </div>
                  </div>
                  <p className="text-red-200 text-sm mb-2">إجراءات الإشراف</p>
                  <p className="text-4xl font-bold text-white mb-1">{guildStats.mod_actions_week}</p>
                  <p className="text-red-300 text-sm">Mod Actions (7d)</p>
                </div>
              </div>
            )}

            {/* Enhanced Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                    <span className="text-3xl">⚠️</span>
                    <span>آخر الإنذارات</span>
                  </h3>
                  <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium">
                    {strikes.length} إنذار
                  </div>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {strikes.length > 0 ? strikes.slice(0, 5).map((strike, index) => (
                    <div key={index} className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border-l-4 border-yellow-500 hover:bg-white/5 transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-bold text-lg">User ID: {strike.user_id}</p>
                          <p className="text-yellow-200 mt-2">{strike.reason}</p>
                          <p className="text-gray-400 text-sm mt-3">
                            مشرف: {strike.moderator_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-medium mb-2">
                            إنذار
                          </div>
                          <p className="text-xs text-gray-300">{formatDate(strike.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12">
                      <span className="text-6xl">✅</span>
                      <p className="text-gray-300 mt-4">لا توجد إنذارات حديثة</p>
                      <p className="text-gray-400 text-sm">No recent strikes</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                    <span className="text-3xl">⚡</span>
                    <span>آخر الإجراءات</span>
                  </h3>
                  <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-medium">
                    {modActions.length} إجراء
                  </div>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {modActions.length > 0 ? modActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="p-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border-l-4 border-red-500 hover:bg-white/5 transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-bold text-lg capitalize">{action.action}</p>
                          <p className="text-red-200 mt-2">{action.reason}</p>
                          <p className="text-gray-400 text-sm mt-3">
                            الهدف: {action.target_id}
                          </p>
                          <p className="text-gray-400 text-sm">
                            مشرف: {action.moderator_id}
                          </p>
                          {action.duration && (
                            <p className="text-blue-200 text-sm mt-1">
                              المدة: {action.duration} دقيقة
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs font-medium mb-2">
                            إجراء
                          </div>
                          <p className="text-xs text-gray-300">{formatDate(action.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12">
                      <span className="text-6xl">🛡️</span>
                      <p className="text-gray-300 mt-4">لا توجد إجراءات حديثة</p>
                      <p className="text-gray-400 text-sm">No recent actions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-6">⚙️ إعدادات البوت</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-blue-200 text-sm font-medium mb-2">
                    قناة الترحيب / Welcome Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.welcome_channel_id || ''}
                    onChange={(e) => setSettings({...settings, welcome_channel_id: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012345678"
                  />
                </div>

                <div>
                  <label className="block text-blue-200 text-sm font-medium mb-2">
                    قناة السجلات / Log Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.log_channel_id || ''}
                    onChange={(e) => setSettings({...settings, log_channel_id: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012345678"
                  />
                </div>

                <div>
                  <label className="block text-blue-200 text-sm font-medium mb-2">
                    الرتبة الافتراضية / Default Role
                  </label>
                  <input
                    type="text"
                    value={settings.default_role_name || 'Member'}
                    onChange={(e) => setSettings({...settings, default_role_name: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-blue-200 text-sm font-medium mb-2">
                    حد الإنذارات / Strike Limit
                  </label>
                  <input
                    type="number"
                    value={settings.strike_limit || 3}
                    onChange={(e) => setSettings({...settings, strike_limit: parseInt(e.target.value)})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-blue-200 text-sm font-medium mb-2">
                    بداية ساعات الهدوء / Quiet Hours Start
                  </label>
                  <input
                    type="time"
                    value={settings.quiet_start || '22:00'}
                    onChange={(e) => setSettings({...settings, quiet_start: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-blue-200 text-sm font-medium mb-2">
                    نهاية ساعات الهدوء / Quiet Hours End
                  </label>
                  <input
                    type="time"
                    value={settings.quiet_end || '08:00'}
                    onChange={(e) => setSettings({...settings, quiet_end: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-blue-200 text-sm font-medium mb-2">
                  رسالة الترحيب (عربي) / Welcome Message (Arabic)
                </label>
                <textarea
                  value={settings.welcome_message_ar || ''}
                  onChange={(e) => setSettings({...settings, welcome_message_ar: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="مرحباً {mention}! أهلاً وسهلاً بك في خادمنا 🎉"
                  dir="rtl"
                />
              </div>

              <div className="mt-4">
                <label className="block text-blue-200 text-sm font-medium mb-2">
                  رسالة الترحيب (إنجليزي) / Welcome Message (English)
                </label>
                <textarea
                  value={settings.welcome_message_en || ''}
                  onChange={(e) => setSettings({...settings, welcome_message_en: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Welcome {mention}! We're glad to have you here 🎉"
                />
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-3 rtl:space-x-reverse">
                  <input
                    type="checkbox"
                    checked={settings.auto_role_enabled}
                    onChange={(e) => setSettings({...settings, auto_role_enabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <span className="text-blue-200 text-sm">تفعيل الأدوار التلقائية</span>
                </label>

                <label className="flex items-center space-x-3 rtl:space-x-reverse">
                  <input
                    type="checkbox"
                    checked={settings.quiet_hours_enabled}
                    onChange={(e) => setSettings({...settings, quiet_hours_enabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <span className="text-blue-200 text-sm">تفعيل ساعات الهدوء</span>
                </label>

                <label className="flex items-center space-x-3 rtl:space-x-reverse">
                  <input
                    type="checkbox"
                    checked={settings.auto_timeout_enabled}
                    onChange={(e) => setSettings({...settings, auto_timeout_enabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <span className="text-blue-200 text-sm">الكتم التلقائي</span>
                </label>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => updateSettings(settings)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  💾 حفظ الإعدادات / Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">⚠️ الإنذارات الأخيرة</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {strikes.map((strike, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg border-l-4 border-yellow-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">User ID: {strike.user_id}</p>
                          <p className="text-yellow-200 text-sm mt-1">{strike.reason}</p>
                          <p className="text-gray-400 text-xs mt-2">
                            Moderator: {strike.moderator_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-300">{formatDate(strike.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">🛡️ إجراءات الإشراف</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {modActions.map((action, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg border-l-4 border-red-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium capitalize">{action.action}</p>
                          <p className="text-red-200 text-sm mt-1">{action.reason}</p>
                          <p className="text-gray-400 text-xs mt-2">
                            Target: {action.target_id} | Moderator: {action.moderator_id}
                          </p>
                          {action.duration && (
                            <p className="text-blue-200 text-xs mt-1">
                              Duration: {action.duration} minutes
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-300">{formatDate(action.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">📈 تقارير الأداء</h3>
              <p className="text-blue-200 mb-4">استخدم الأوامر التالية في الديسكورد:</p>
              
              <div className="space-y-3">
                <div className="p-4 bg-white/5 rounded-lg">
                  <code className="text-green-400">!الإحصائيات</code>
                  <p className="text-gray-300 text-sm mt-2">عرض إحصائيات الخادم الحالية</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <code className="text-green-400">!الأدوار</code>
                  <p className="text-gray-300 text-sm mt-2">عرض قائمة اختيار الأدوار التفاعلية</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <code className="text-green-400">!مسح [العدد]</code>
                  <p className="text-gray-300 text-sm mt-2">حذف عدد معين من الرسائل</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <code className="text-green-400">!كتم @المستخدم [المدة بالدقائق]</code>
                  <p className="text-gray-300 text-sm mt-2">كتم مستخدم لفترة محددة</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <code className="text-green-400">!طرد @المستخدم [السبب]</code>
                  <p className="text-gray-300 text-sm mt-2">طرد مستخدم من الخادم</p>
                </div>
              </div>
            </div>

            {guildStats && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">📊 ملخص الإحصائيات</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{guildStats.total_members}</div>
                    <div className="text-sm text-gray-300">إجمالي الأعضاء</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{guildStats.new_members_week}</div>
                    <div className="text-sm text-gray-300">أعضاء جدد</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">{guildStats.total_strikes}</div>
                    <div className="text-sm text-gray-300">إجمالي الإنذارات</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">{guildStats.mod_actions_week}</div>
                    <div className="text-sm text-gray-300">إجراءات الإشراف</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
