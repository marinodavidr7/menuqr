'use client';

import { useState, useEffect, use } from 'react';
import { Users, UserPlus, Shield, Trash2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserRole } from '@/lib/types';

interface Member {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function TeamPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario nuevo miembro
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('waiter');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/team?merchantSlug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [slug]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantSlug: slug,
          name,
          email,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg(data.message || 'Miembro incorporado al equipo');
      setName('');
      setEmail('');
      await fetchMembers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('¿Seguro que querés remover este miembro del equipo?')) return;
    try {
      await fetch(`/api/team?merchantSlug=${slug}&userId=${userId}`, {
        method: 'DELETE',
      });
      await fetchMembers();
    } catch {}
  };

  const roleLabels: Record<UserRole, { label: string; badge: string; desc: string }> = {
    owner: { label: 'Dueño', badge: 'bg-brand-blue/20 text-brand-blue', desc: 'Acceso total y configuración de cuenta' },
    manager: { label: 'Encargada / Manager', badge: 'bg-brand-amber/20 text-brand-amber', desc: 'Gestión de caja, salón, cocina y carta' },
    waiter: { label: 'Mozo / Salón', badge: 'bg-brand-success/20 text-brand-success', desc: 'Atención de salón, pedidos y cuentas' },
    kitchen: { label: 'Cocina / Chef', badge: 'bg-purple-500/20 text-purple-400', desc: 'Comandera táctil (sin acceso a caja ni métricas)' },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Equipo & Permisos</h1>
            <p className="text-xs text-text-secondary">
              Administración de roles (Dueño, Encargado, Mozo, Cocina)
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-brand-success/15 border border-brand-success/30 rounded-xl text-xs font-bold text-brand-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-xs font-bold text-brand-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Incorporación */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-blue" />
            <h3 className="text-base font-bold text-white">Incorporar colaborador</h3>
          </div>

          <form onSubmit={handleAddMember} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre completo *</label>
              <input
                type="text"
                required
                placeholder="Ej: Marcos Maidana"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Correo electrónico *</label>
              <input
                type="email"
                required
                placeholder="colaborador@menuqr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Rol en el local *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              >
                <option value="waiter" className="bg-surface">🛎️ Mozo (Salón)</option>
                <option value="kitchen" className="bg-surface">🍳 Cocina (Chef)</option>
                <option value="manager" className="bg-surface">📋 Encargado (Manager)</option>
                <option value="owner" className="bg-surface">👔 Dueño (Owner)</option>
              </select>
              <p className="text-[11px] text-text-muted mt-1">{roleLabels[role]?.desc}</p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm rounded-xl shadow-md transition-all mt-1"
            >
              Asignar rol al equipo
            </button>
          </form>
        </div>

        {/* Lista de Miembros Actuales */}
        <div className="lg:col-span-2 bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-base font-bold text-white">Miembros del local ({members.length})</h3>

          <div className="flex flex-col divide-y divide-surface-border">
            {members.map((m) => {
              const meta = roleLabels[m.role] || { label: m.role, badge: 'bg-surface text-white', desc: '' };

              return (
                <div key={m.user_id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-hover border border-surface-border text-white flex items-center justify-center font-bold text-xs uppercase">
                      {m.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{m.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>
                      <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-text-muted" />
                        {m.email}
                      </span>
                    </div>
                  </div>

                  {m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="w-8 h-8 rounded-lg bg-surface hover:bg-brand-danger/20 text-text-muted hover:text-brand-danger flex items-center justify-center transition-colors"
                      title="Remover miembro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
