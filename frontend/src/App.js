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
    } catch (error) {
      console.error('Error fetching bot status:', error);
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
    } catch (error) {
      console.error('Error fetching guilds:', error);
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
    } catch (error) {
      console.error('Error fetching guild data:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    if (!selectedGuild) return;

    try {
      await axios.put(`${API}/bot/settings/${selectedGuild.id}`, newSettings);
      setSettings({ ...settings, ...newSettings });
      alert('✅ تم تحديث الإعدادات بنجاح / Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-2xl">🤖 جاري تحميل البوت... / Loading Bot...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-800">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">المنظِّم الذكي</h1>
                <p className="text-blue-200">SmartModerator Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              {botStatus && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className={`w-3 h-3 rounded-full ${botStatus.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-white">{botStatus.status === 'online' ? 'متصل' : 'غير متصل'}</span>
                </div>
              )}
              
              {selectedGuild && (
                <select 
                  value={selectedGuild.id} 
                  onChange={(e) => setSelectedGuild(guilds.find(g => g.id === e.target.value))}
                  className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {guilds.map(guild => (
                    <option key={guild.id} value={guild.id} className="bg-gray-800 text-white">
                      {guild.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-1 rtl:space-x-reverse bg-black/20 p-1 rounded-xl">
            {[
              { id: 'dashboard', name: 'لوحة القيادة', icon: '📊' },
              { id: 'settings', name: 'الإعدادات', icon: '⚙️' },
              { id: 'moderation', name: 'الإشراف', icon: '🛡️' },
              { id: 'reports', name: 'التقارير', icon: '📈' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            {guildStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">إجمالي الأعضاء</p>
                      <p className="text-3xl font-bold text-white">{guildStats.total_members}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">أعضاء جدد (7 أيام)</p>
                      <p className="text-3xl font-bold text-white">{guildStats.new_members_week}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🆕</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-200 text-sm">إجمالي الإنذارات</p>
                      <p className="text-3xl font-bold text-white">{guildStats.total_strikes}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">⚠️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-200 text-sm">إجراءات الإشراف (7 أيام)</p>
                      <p className="text-3xl font-bold text-white">{guildStats.mod_actions_week}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🛡️</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">🔥 آخر الإنذارات</h3>
                <div className="space-y-3">
                  {strikes.slice(0, 5).map((strike, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-medium">User ID: {strike.user_id}</p>
                        <p className="text-blue-200 text-sm">{strike.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-300">{formatDate(strike.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">⚡ آخر الإجراءات</h3>
                <div className="space-y-3">
                  {modActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{action.action}</p>
                        <p className="text-blue-200 text-sm">{action.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-300">{formatDate(action.timestamp)}</p>
                      </div>
                    </div>
                  ))}
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
