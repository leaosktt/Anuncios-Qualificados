import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, Palette, Upload, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import pageStyles from './Pages.module.css';
import styles from './Settings.module.css';

const DEFAULT_NOTIFS = {
  email_new_lead: true,
  email_lead_moved: false,
  email_task_due: true,
  sys_new_lead: true,
  sys_lead_moved: true,
  sys_task_due: true,
  sys_task_late: true,
  sys_new_client: true,
};

const Settings = () => {
  const { user, updateProfileContext } = useAuth();
  const navigate = useNavigate();
  const { theme, accentColor, fontSize, setTheme, setAccentColor, setFontSize } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef(null);

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: <User size={18} /> },
    { id: 'notifications', label: 'Notificações', icon: <Bell size={18} /> },
    { id: 'privacy', label: 'Privacidade', icon: <Shield size={18} /> },
    { id: 'appearance', label: 'Aparência', icon: <Palette size={18} /> },
  ];

  // ---------- Perfil ----------
  const [profile, setProfile] = useState({ full_name: '', role: '', phone: '', avatar_url: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role, phone, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setProfile({
            full_name: data.full_name || '',
            role: data.role || '',
            phone: data.phone || '',
            avatar_url: data.avatar_url || '',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileMessage('');
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name.trim(),
        role: profile.role.trim(),
        phone: profile.phone.trim(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      
      if (updateProfileContext) {
        updateProfileContext({
          full_name: profile.full_name.trim(),
          role: profile.role.trim(),
          phone: profile.phone.trim(),
        });
      }

      setProfileMessage('Alterações salvas com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setProfileMessage('Não foi possível salvar as alterações. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setProfileMessage('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
      
      if (updateProfileContext) {
        updateProfileContext({ avatar_url: avatarUrl });
      }

      setProfileMessage('Foto de perfil atualizada.');
    } catch (error) {
      console.error('Erro ao enviar avatar:', error);
      setProfileMessage('Não foi possível enviar a imagem. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---------- Notificações ----------
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);

  useEffect(() => {
    if (!user) return;

    const loadNotifPrefs = async () => {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setNotifs({
            email_new_lead: data.email_new_lead,
            email_lead_moved: data.email_lead_moved,
            email_task_due: data.email_task_due,
            sys_new_lead: data.sys_new_lead,
            sys_lead_moved: data.sys_lead_moved,
            sys_task_due: data.sys_task_due,
            sys_task_late: data.sys_task_late,
            sys_new_client: data.sys_new_client,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar preferências de notificação:', error);
      }
    };

    loadNotifPrefs();
  }, [user]);

  const handleToggle = async (key) => {
    if (!user) return;
    const nextValue = !notifs[key];
    setNotifs((prev) => ({ ...prev, [key]: nextValue }));
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, [key]: nextValue, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar preferência de notificação:', error);
      setNotifs((prev) => ({ ...prev, [key]: !nextValue }));
    }
  };

  // ---------- Privacidade ----------
  const [visibility, setVisibility] = useState('team');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadVisibility = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('profile_visibility')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data?.profile_visibility) setVisibility(data.profile_visibility);
      } catch (error) {
        console.error('Erro ao carregar preferência de privacidade:', error);
      }
    };

    loadVisibility();
  }, [user]);

  const handleVisibilityChange = async (value) => {
    setVisibility(value);
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, profile_visibility: value, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar preferência de privacidade:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('Tem certeza absoluta? Esta ação apagará permanentemente sua conta e todos os seus dados, e não pode ser desfeita.')) {
      return;
    }

    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      window.alert('Não foi possível excluir a conta agora. Tente novamente mais tarde.');
      setDeletingAccount(false);
    }
  };

  return (
    <div className={pageStyles.pageContainer}>
      <div className={pageStyles.header}>
        <h2 className={pageStyles.title}>Configurações</h2>
      </div>

      <div className={styles.settingsLayout}>
        <div className={styles.sidebar}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {activeTab === 'profile' && (
            <div>
              <h3 className={styles.sectionTitle}>Perfil Público</h3>
              <p className={styles.sectionDesc}>Estas informações serão exibidas publicamente para sua equipe.</p>

              <div className={styles.avatarSection}>
                <div className={styles.avatarCircle}>
                  <img
                    src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=f43f5e,8b5cf6'}
                    alt="Avatar"
                  />
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/gif"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    className={pageStyles.buttonPrimary}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    <Upload size={16} /> {uploadingAvatar ? 'Enviando...' : 'Nova foto'}
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>JPG, GIF ou PNG. Tamanho máximo de 2MB.</span>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nome Completo</label>
                  <input type="text" className={styles.formInput} value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>E-mail de Cadastro</label>
                  <input type="email" className={styles.formInput} value={user?.email || ''} disabled />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Cargo / Função</label>
                  <input type="text" className={styles.formInput} value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Telefone</label>
                  <input type="text" className={styles.formInput} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
                {profileMessage && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{profileMessage}</span>}
                <button className={pageStyles.buttonPrimary} onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 className={styles.sectionTitle}>Preferências de Notificação</h3>
              <p className={styles.sectionDesc}>Escolha como e quando você quer ser avisado sobre atualizações.</p>

              <div style={{ marginBottom: '2.5rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Notificações por E-mail</h4>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Novo Lead criado</div>
                    <div className={styles.toggleDesc}>Receber e-mail quando um novo lead cair no funil.</div>
                  </div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={notifs.email_new_lead} onChange={() => handleToggle('email_new_lead')} />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Lead movido de coluna</div>
                    <div className={styles.toggleDesc}>Avisar sobre o avanço de negociações importantes.</div>
                  </div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={notifs.email_lead_moved} onChange={() => handleToggle('email_lead_moved')} />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Tarefa vencendo hoje</div>
                    <div className={styles.toggleDesc}>Resumo matinal com as tarefas do dia.</div>
                  </div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={notifs.email_task_due} onChange={() => handleToggle('email_task_due')} />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Notificações no Sistema (Sino)</h4>

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>Novo Lead criado</div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={notifs.sys_new_lead} onChange={() => handleToggle('sys_new_lead')} />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>Lead movido de coluna</div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={notifs.sys_lead_moved} onChange={() => handleToggle('sys_lead_moved')} />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>Tarefa atrasada</div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={notifs.sys_task_late} onChange={() => handleToggle('sys_task_late')} />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>Novo cliente adicionado</div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={notifs.sys_new_client} onChange={() => handleToggle('sys_new_client')} />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div>
              <h3 className={styles.sectionTitle}>Privacidade e Dados</h3>
              <p className={styles.sectionDesc}>Controle a visibilidade da sua conta e o uso de dados.</p>

              <div className={styles.formGroup} style={{ maxWidth: '400px' }}>
                <label className={styles.formLabel}>Visibilidade do Perfil</label>
                <select className={styles.formInput} value={visibility} onChange={e => handleVisibilityChange(e.target.value)}>
                  <option value="team">Público para a equipe</option>
                  <option value="admins">Apenas administradores</option>
                  <option value="private">Privado</option>
                </select>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Exportação</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Baixe um arquivo contendo todas as suas informações de CRM, leads e clientes em formato CSV.</p>
                <button className={pageStyles.buttonOutline} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Exportar meus dados
                </button>
              </div>

              <div className={styles.dangerZone}>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--status-danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} /> Excluir Conta
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Ao excluir sua conta, todos os seus dados, leads, clientes e configurações serão apagados permanentemente. Esta ação é irreversível.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  style={{ backgroundColor: 'var(--status-danger)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: deletingAccount ? 'not-allowed' : 'pointer', opacity: deletingAccount ? 0.7 : 1 }}>
                  {deletingAccount ? 'Excluindo conta...' : 'Excluir minha conta'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h3 className={styles.sectionTitle}>Aparência</h3>
              <p className={styles.sectionDesc}>Personalize o visual e as cores do CRM para se adequar ao seu estilo.</p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tema do Sistema</label>
                <div className={styles.themeGrid}>
                  <div className={`${styles.themeBox} ${theme === 'light' ? styles.active : ''}`} onClick={() => setTheme('light')}>Claro</div>
                  <div className={`${styles.themeBox} ${theme === 'dark' ? styles.active : ''}`} onClick={() => setTheme('dark')}>Escuro</div>
                  <div className={`${styles.themeBox} ${theme === 'system' ? styles.active : ''}`} onClick={() => setTheme('system')}>Automático (Sistema)</div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '2rem' }}>
                <label className={styles.formLabel}>Cor de Destaque</label>
                <div className={styles.colorDots}>
                  <div className={`${styles.colorDot} ${accentColor === 'purple' ? styles.active : ''}`} style={{ backgroundColor: '#8b5cf6' }} onClick={() => setAccentColor('purple')}></div>
                  <div className={`${styles.colorDot} ${accentColor === 'blue' ? styles.active : ''}`} style={{ backgroundColor: '#3b82f6' }} onClick={() => setAccentColor('blue')}></div>
                  <div className={`${styles.colorDot} ${accentColor === 'green' ? styles.active : ''}`} style={{ backgroundColor: '#10b981' }} onClick={() => setAccentColor('green')}></div>
                  <div className={`${styles.colorDot} ${accentColor === 'orange' ? styles.active : ''}`} style={{ backgroundColor: '#f59e0b' }} onClick={() => setAccentColor('orange')}></div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '2rem', maxWidth: '300px' }}>
                <label className={styles.formLabel}>Tamanho da Fonte</label>
                <select className={styles.formInput} value={fontSize} onChange={e => setFontSize(e.target.value)}>
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio (Padrão)</option>
                  <option value="large">Grande</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
