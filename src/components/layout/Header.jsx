import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

const formatRelativeTime = (isoDate) => {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
};

const Header = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  
  // Format title based on path
  const getTitle = () => {
    const path = location.pathname.substring(1);
    if (!path || path === 'dashboard') return 'Início';
    if (path === 'leads') return 'Leads';
    if (path === 'settings') return 'Configurações';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        setNotifications(data || []);
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };

    fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notification) => {
    if (notification.read) return;
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: false } : n));
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: false } : n));
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.titleContainer}>
        <h1 className={styles.title}>{getTitle()}</h1>
      </div>

      <div className={styles.actions}>
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search or ⌘K..." 
            className={styles.searchInput}
          />
        </div>

        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className={styles.iconButton} onClick={() => setIsNotifOpen(!isNotifOpen)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>

          {isNotifOpen && (
            <div className={styles.notifDropdown}>
              <div className={styles.notifHeader}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notificações</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    Marcar lidas
                  </button>
                )}
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma notificação recente</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`${styles.notifItem} ${!n.read ? styles.unread : ''}`}
                      onClick={() => markAsRead(n)}
                      style={{ cursor: n.read ? 'default' : 'pointer' }}
                    >
                      <div className={styles.notifIndicator}>
                        {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.9rem', color: !n.read ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: '4px', lineHeight: 1.4 }}>{n.text}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatRelativeTime(n.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className={styles.profileButton}>
          <img 
            src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=f43f5e,8b5cf6"} 
            alt="User profile" 
            className={styles.avatar}
          />
        </button>
      </div>
    </header>
  );
};

export default Header;
