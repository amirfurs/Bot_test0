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
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-3xl">⚙️</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">إعدادات البوت</h3>
                  <p className="text-purple-200">Bot Configuration</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-blue-200 text-sm font-bold mb-3">
                      🎉 قناة الترحيب / Welcome Channel ID
                    </label>
                    <input
                      type="text"
                      value={settings.welcome_channel_id || ''}
                      onChange={(e) => setSettings({...settings, welcome_channel_id: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                      placeholder="123456789012345678"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-200 text-sm font-bold mb-3">
                      📝 قناة السجلات / Log Channel ID
                    </label>
                    <input
                      type="text"
                      value={settings.log_channel_id || ''}
                      onChange={(e) => setSettings({...settings, log_channel_id: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                      placeholder="123456789012345678"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-200 text-sm font-bold mb-3">
                      🏷️ الرتبة الافتراضية / Default Role
                    </label>
                    <input
                      type="text"
                      value={settings.default_role_name || 'Member'}
                      onChange={(e) => setSettings({...settings, default_role_name: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-200 text-sm font-bold mb-3">
                      ⚠️ حد الإنذارات / Strike Limit
                    </label>
                    <input
                      type="number"
                      value={settings.strike_limit || 3}
                      onChange={(e) => setSettings({...settings, strike_limit: parseInt(e.target.value)})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-blue-200 text-sm font-bold mb-3">
                      🌙 بداية ساعات الهدوء / Quiet Hours Start
                    </label>
                    <input
                      type="time"
                      value={settings.quiet_start || '22:00'}
                      onChange={(e) => setSettings({...settings, quiet_start: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-200 text-sm font-bold mb-3">
                      ☀️ نهاية ساعات الهدوء / Quiet Hours End
                    </label>
                    <input
                      type="time"
                      value={settings.quiet_end || '08:00'}
                      onChange={(e) => setSettings({...settings, quiet_end: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                    />
                  </div>

                  {/* Toggle Settings */}
                  <div className="bg-white/5 rounded-xl p-6 space-y-4">
                    <h4 className="text-white font-bold text-lg mb-4">إعدادات التفعيل / Activation Settings</h4>
                    
                    <label className="flex items-center justify-between p-4 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-all">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🎭</span>
                        <span className="text-white font-medium">تفعيل الأدوار التلقائية</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.auto_role_enabled}
                        onChange={(e) => setSettings({...settings, auto_role_enabled: e.target.checked})}
                        className="w-6 h-6 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-all">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🌙</span>
                        <span className="text-white font-medium">تفعيل ساعات الهدوء</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.quiet_hours_enabled}
                        onChange={(e) => setSettings({...settings, quiet_hours_enabled: e.target.checked})}
                        className="w-6 h-6 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-all">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🔇</span>
                        <span className="text-white font-medium">الكتم التلقائي</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.auto_timeout_enabled}
                        onChange={(e) => setSettings({...settings, auto_timeout_enabled: e.target.checked})}
                        className="w-6 h-6 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Welcome Messages */}
              <div className="mt-8 space-y-6">
                <div>
                  <label className="block text-blue-200 text-sm font-bold mb-3">
                    🇸🇦 رسالة الترحيب (عربي) / Welcome Message (Arabic)
                  </label>
                  <textarea
                    value={settings.welcome_message_ar || ''}
                    onChange={(e) => setSettings({...settings, welcome_message_ar: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                    rows="4"
                    placeholder="مرحباً {mention}! أهلاً وسهلاً بك في خادمنا 🎉"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-blue-200 text-sm font-bold mb-3">
                    🇺🇸 رسالة الترحيب (إنجليزي) / Welcome Message (English)
                  </label>
                  <textarea
                    value={settings.welcome_message_en || ''}
                    onChange={(e) => setSettings({...settings, welcome_message_en: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-lg"
                    rows="4"
                    placeholder="Welcome {mention}! We're glad to have you here 🎉"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => updateSettings(settings)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-12 py-4 rounded-xl text-lg shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3"
                >
                  <span className="text-2xl">💾</span>
                  <span>حفظ الإعدادات / Save Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                    <span className="text-3xl">⚠️</span>
                    <span>سجل الإنذارات</span>
                  </h3>
                  <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium">
                    {strikes.length} إنذار إجمالي
                  </div>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {strikes.length > 0 ? strikes.map((strike, index) => (
                    <div key={index} className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border-l-4 border-yellow-500 hover:shadow-lg transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">👤</span>
                            <p className="text-white font-bold text-lg">User ID: {strike.user_id}</p>
                          </div>
                          <div className="bg-yellow-500/20 rounded-lg p-4 mb-3">
                            <p className="text-yellow-200 font-medium">{strike.reason}</p>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <p className="text-gray-400 flex items-center space-x-2">
                              <span>👮</span>
                              <span>مشرف: {strike.moderator_id}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
                            STRIKE
                          </div>
                          <p className="text-xs text-gray-300">{formatDate(strike.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-16">
                      <span className="text-8xl mb-4 block">✅</span>
                      <p className="text-gray-300 text-xl font-bold mb-2">لا توجد إنذارات</p>
                      <p className="text-gray-400">No strikes recorded</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                    <span className="text-3xl">🛡️</span>
                    <span>سجل الإجراءات</span>
                  </h3>
                  <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-medium">
                    {modActions.length} إجراء إجمالي
                  </div>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {modActions.length > 0 ? modActions.map((action, index) => (
                    <div key={index} className="p-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border-l-4 border-red-500 hover:shadow-lg transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">
                              {action.action === 'kick' ? '👢' : 
                               action.action === 'timeout' ? '🔇' : 
                               action.action === 'purge' ? '🗑️' : '⚡'}
                            </span>
                            <p className="text-white font-bold text-lg capitalize">{action.action}</p>
                          </div>
                          <div className="bg-red-500/20 rounded-lg p-4 mb-3">
                            <p className="text-red-200 font-medium">{action.reason}</p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-400 flex items-center space-x-2">
                              <span>🎯</span>
                              <span>الهدف: {action.target_id}</span>
                            </p>
                            <p className="text-gray-400 flex items-center space-x-2">
                              <span>👮</span>
                              <span>مشرف: {action.moderator_id}</span>
                            </p>
                            {action.duration && (
                              <p className="text-blue-200 flex items-center space-x-2">
                                <span>⏰</span>
                                <span>المدة: {action.duration} دقيقة</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
                            ACTION
                          </div>
                          <p className="text-xs text-gray-300">{formatDate(action.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-16">
                      <span className="text-8xl mb-4 block">🛡️</span>
                      <p className="text-gray-300 text-xl font-bold mb-2">لا توجد إجراءات</p>
                      <p className="text-gray-400">No actions recorded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8">
            {/* Commands Reference */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📋</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">دليل الأوامر</h3>
                  <p className="text-green-200">استخدم هذه الأوامر في الديسكورد</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                    <span>👑</span>
                    <span>أوامر الإدارة</span>
                  </h4>
                  
                  <div className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl border border-green-400/30">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">📊</span>
                      <code className="text-green-400 font-bold text-lg">!الإحصائيات</code>
                    </div>
                    <p className="text-gray-300">عرض إحصائيات الخادم الحالية</p>
                    <p className="text-gray-400 text-sm mt-1">Display current server statistics</p>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-400/30">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">🎭</span>
                      <code className="text-purple-400 font-bold text-lg">!الأدوار</code>
                    </div>
                    <p className="text-gray-300">عرض قائمة اختيار الأدوار التفاعلية</p>
                    <p className="text-gray-400 text-sm mt-1">Show interactive role selection menu</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                    <span>🛡️</span>
                    <span>أوامر الإشراف</span>
                  </h4>
                  
                  <div className="p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-400/30">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">🗑️</span>
                      <code className="text-red-400 font-bold text-lg">!مسح [العدد]</code>
                    </div>
                    <p className="text-gray-300">حذف عدد معين من الرسائل</p>
                    <p className="text-gray-400 text-sm mt-1">Delete specific number of messages</p>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-yellow-500/10 to-red-500/10 rounded-xl border border-yellow-400/30">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">🔇</span>
                      <code className="text-yellow-400 font-bold text-lg">!كتم @المستخدم [المدة]</code>
                    </div>
                    <p className="text-gray-300">كتم مستخدم لفترة محددة بالدقائق</p>
                    <p className="text-gray-400 text-sm mt-1">Mute user for specified minutes</p>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border border-red-400/30">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">👢</span>
                      <code className="text-red-400 font-bold text-lg">!طرد @المستخدم [السبب]</code>
                    </div>
                    <p className="text-gray-300">طرد مستخدم من الخادم</p>
                    <p className="text-gray-400 text-sm mt-1">Kick user from server</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Summary */}
            {guildStats && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📈</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white">ملخص الإحصائيات</h3>
                    <p className="text-blue-200">Statistics Overview</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-400/30">
                    <div className="text-5xl font-bold text-blue-400 mb-2">{guildStats.total_members}</div>
                    <div className="text-blue-200 font-medium">إجمالي الأعضاء</div>
                    <div className="text-xs text-gray-400 mt-1">Total Members</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-400/30">
                    <div className="text-5xl font-bold text-green-400 mb-2">{guildStats.new_members_week}</div>
                    <div className="text-green-200 font-medium">أعضاء جدد</div>
                    <div className="text-xs text-gray-400 mt-1">New Members</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-xl border border-yellow-400/30">
                    <div className="text-5xl font-bold text-yellow-400 mb-2">{guildStats.total_strikes}</div>
                    <div className="text-yellow-200 font-medium">إجمالي الإنذارات</div>
                    <div className="text-xs text-gray-400 mt-1">Total Strikes</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-red-500/20 to-pink-600/20 rounded-xl border border-red-400/30">
                    <div className="text-5xl font-bold text-red-400 mb-2">{guildStats.mod_actions_week}</div>
                    <div className="text-red-200 font-medium">إجراءات الإشراف</div>
                    <div className="text-xs text-gray-400 mt-1">Mod Actions</div>
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
