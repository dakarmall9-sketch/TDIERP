import React, { useState } from 'react';
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Search,
  Paperclip,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmailMessage } from '../../types';
import { useLocalDraft } from '../../hooks/useAutoSave';

const COMPOSE_DRAFT_KEY = 'transmove_draft_email_compose';

export const EmailClientModule: React.FC = () => {
  const { emails, sendEmailMessage, deleteEmailMessage, smtpConfigured, currentCompany } = useApp();
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(emails[0] || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose state (persisted in real time)
  const [composeDraft, setComposeDraft, clearComposeDraft] = useLocalDraft(COMPOSE_DRAFT_KEY, {
    recipient: '',
    subject: '',
    body: '',
  });
  const recipient = composeDraft.recipient;
  const subject = composeDraft.subject;
  const body = composeDraft.body;
  const setRecipient = (recipient: string) => setComposeDraft((p) => ({ ...p, recipient }));
  const setSubject = (subject: string) => setComposeDraft((p) => ({ ...p, subject }));
  const setBody = (body: string) => setComposeDraft((p) => ({ ...p, body }));
  const [isSending, setIsSending] = useState(false);

  const templates = [
    {
      id: 'devis',
      title: 'Modèle : Envoi de devis déménagement',
      subject: 'Votre devis de déménagement officiel #DEV-2026-xxxx',
      body: `Bonjour,\n\nVeuillez trouver ci-joint votre devis personnalisé pour votre prestation de déménagement.\nNos équipes restent à votre entière disposition pour tout renseignement complémentaire.\n\nCordialement,\nService Commercial ${currentCompany.name}`,
    },
    {
      id: 'relance',
      title: 'Modèle : Relance facture impayée',
      subject: 'Rappel d’échéance : Facture en attente de règlement',
      body: `Bonjour,\n\nSauf erreur de notre part, votre facture arrivée à échéance est toujours en attente de règlement.\nMerci de bien vouloir régulariser votre solde via virement ou Mobile Money.\n\nBien cordialement,\nService Comptabilité ${currentCompany.name}`,
    },
    {
      id: 'douane',
      title: 'Modèle : Demande de document douane / transit',
      subject: 'URGENT : Pièce manquante pour dédouanement conteneur',
      body: `Bonjour,\n\nPour finaliser la déclaration douanière de votre expédition maritime, nous vous remercions de bien vouloir nous transmettre sans délai la copie du certificat d’origine et la facture commerciale finale.\n\nPôle Transit International ${currentCompany.name}`,
    },
  ];

  const applyTemplate = (tmplId: string) => {
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  const handleDispatch = async (folder: 'sent' | 'drafts') => {
    if (!subject.trim()) return;
    if (folder === 'sent' && !recipient.trim()) return;

    setIsSending(true);
    try {
      await sendEmailMessage({
        folder,
        senderName: currentCompany.name,
        senderEmail: currentCompany.email,
        recipientEmail: recipient.trim(),
        subject: subject.trim(),
        body,
        isRead: true,
      });

      setIsComposeOpen(false);
      clearComposeDraft();
      setCurrentFolder(folder);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleDispatch('sent');
  };

  const filteredEmails = emails.filter((m) => {
    const matchFolder = m.folder === currentFolder;
    const matchSearch =
      m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFolder && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 12
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Messagerie Email Intégrée & Modèles Transactionnels
            </h1>
            {smtpConfigured ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> SMTP Actif
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3" /> Variables SMTP serveur requises
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Envoi réel via serveur SMTP (Nodemailer) + archivage Firestore rattaché aux devis, chantiers, factures et dossiers de douane
          </p>
        </div>

        <button
          onClick={() => setIsComposeOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
        >
          <Mail className="w-4 h-4" />
          <span>Rédiger un Email</span>
        </button>
      </div>

      {/* Email Client Layout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Column: Folders */}
        <div className="md:col-span-3 border-r border-slate-800 p-4 space-y-4 bg-slate-950/60">
          <div className="space-y-1">
            <button
              onClick={() => setCurrentFolder('inbox')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                currentFolder === 'inbox'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                <span>Boîte de réception</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-300">
                {emails.filter((e) => e.folder === 'inbox').length}
              </span>
            </button>

            <button
              onClick={() => setCurrentFolder('sent')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                currentFolder === 'sent'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Envoyés</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-300">
                {emails.filter((e) => e.folder === 'sent').length}
              </span>
            </button>

            <button
              onClick={() => setCurrentFolder('drafts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                currentFolder === 'drafts'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Brouillons</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-300">
                {emails.filter((e) => e.folder === 'drafts').length}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modèles d'emails</div>
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  applyTemplate(tmpl.id);
                  setIsComposeOpen(true);
                }}
                className="w-full text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 transition"
              >
                {tmpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* Center Column: List of messages in folder */}
        <div className="md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-900/40">
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredEmails.map((msg) => {
              const isSelected = selectedEmail?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedEmail(msg)}
                  className={`p-3.5 cursor-pointer transition ${
                    isSelected ? 'bg-amber-500/10 border-l-4 border-amber-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-slate-300 truncate max-w-[140px]">{msg.senderName}</span>
                    <span>{new Date(msg.date).toLocaleDateString()}</span>
                  </div>
                  <div className="font-semibold text-white text-xs truncate">{msg.subject}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">{msg.body}</div>
                  {msg.linkedEntityType && (
                    <div className="mt-2 text-[9px] font-bold text-amber-400/90 uppercase">
                      Rattaché à : {msg.linkedEntityType}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredEmails.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">Aucun message dans ce dossier.</div>
            )}
          </div>
        </div>

        {/* Right Column: Email Viewer */}
        <div className="md:col-span-5 p-6 bg-slate-950/40 flex flex-col justify-between">
          {selectedEmail ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base">{selectedEmail.subject}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      deleteEmailMessage(selectedEmail.id);
                      setSelectedEmail(null);
                    }}
                    title="Supprimer ce message"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                  <div>
                    De : <span className="font-bold text-slate-200">{selectedEmail.senderName}</span> ({selectedEmail.senderEmail})
                  </div>
                  <div>{new Date(selectedEmail.date).toLocaleString()}</div>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  À : <span className="text-slate-300">{selectedEmail.recipientEmail || 'Non spécifié'}</span>
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line py-2">
                {selectedEmail.body}
              </div>

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Pièces jointes ({selectedEmail.attachments.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-400 font-mono">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{att.name} ({att.size})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sélectionnez un message
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" />
              Nouveau Message Email — {currentCompany.name}
            </h3>

            {!smtpConfigured && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                Mode archivage actif : configurez les variables serveur <code>SMTP_HOST</code>, <code>SMTP_USER</code> et <code>SMTP_PASS</code> pour l'envoi SMTP réel.
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Destinataire (Email)</label>
                <input
                  type="email"
                  required
                  placeholder="client@domaine.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Objet du message</label>
                <input
                  type="text"
                  required
                  placeholder="Objet..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contenu</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Tapez votre message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSending || !subject.trim()}
                  onClick={() => handleDispatch('drafts')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold disabled:opacity-40"
                >
                  Enregistrer brouillon
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isSending ? 'Envoi...' : "Envoyer l'Email"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
