"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

interface DataSummary {
  totalMessages: number;
  totalMemories: number;
  accountCreatedAt: string | null;
}

const COPY: Record<string, {
  title: string;
  subtitle: string;
  storedEyebrow: string;
  totalMessages: string;
  totalMemories: string;
  thirdPartyEyebrow: string;
  thirdPartyBody: string;
  exportEyebrow: string;
  exportCta: string;
  deleteEyebrow: string;
  deleteBody: string;
  deleteRequest: string;
  deleteConfirm: string;
  deleting: string;
  deleteDone: string;
  confirmHint: string;
  svcGroq: string;
  svcGemini: string;
  svcCloudflare: string;
  svcSupabase: string;
  svcDataGroq: string;
  svcDataGemini: string;
  svcDataCloudflare: string;
  svcDataSupabase: string;
  svcPurposeGroq: string;
  svcPurposeGemini: string;
  svcPurposeCloudflare: string;
  svcPurposeSupabase: string;
}> = {
  ko: {
    title: "내 데이터 현황",
    subtitle: "저장된 데이터와 개인정보 제어",
    storedEyebrow: "저장된 데이터",
    totalMessages: "총 대화 수",
    totalMemories: "저장된 기억",
    thirdPartyEyebrow: "제3자 AI 서비스",
    thirdPartyBody: "GYEOL은 아래 서비스에 데이터를 전송합니다. 각 서비스의 개인정보처리방침이 적용됩니다.",
    exportEyebrow: "데이터 내보내기 (GDPR)",
    exportCta: "내 모든 데이터 다운로드",
    deleteEyebrow: "데이터 삭제 (GDPR Right to Erasure)",
    deleteBody: "모든 대화, 기억, 계정 정보가 영구 삭제됩니다. 되돌릴 수 없어요.",
    deleteRequest: "계정 및 데이터 삭제 요청",
    deleteConfirm: "⚠️ 확인: 모든 데이터를 삭제합니다",
    deleting: "삭제 중...",
    deleteDone: "삭제 요청이 처리됐어요. 잠시 후 이동합니다...",
    confirmHint: "버튼을 한 번 더 눌러 최종 확인하세요",
    svcGroq: "Groq",
    svcGemini: "Gemini",
    svcCloudflare: "Cloudflare Workers AI",
    svcSupabase: "Supabase",
    svcDataGroq: "대화 내용 (처리 후 미저장)",
    svcDataGemini: "텍스트 분석 (처리 후 미저장)",
    svcDataCloudflare: "이미지 프롬프트 (처리 후 미저장)",
    svcDataSupabase: "계정, 대화, 메모리 (암호화 저장)",
    svcPurposeGroq: "AI 대화 생성",
    svcPurposeGemini: "감정 분석 / 번역",
    svcPurposeCloudflare: "이미지 생성",
    svcPurposeSupabase: "데이터 저장",
  },
  en: {
    title: "Your Data",
    subtitle: "Review what we store and control your privacy",
    storedEyebrow: "Stored Data",
    totalMessages: "Total Messages",
    totalMemories: "Stored Memories",
    thirdPartyEyebrow: "Third-Party AI Services",
    thirdPartyBody: "GYEOL sends data to the services below. Each has its own privacy policy.",
    exportEyebrow: "Data Export (GDPR)",
    exportCta: "Download all my data",
    deleteEyebrow: "Delete Data (GDPR Right to Erasure)",
    deleteBody: "All conversations, memories, and account info will be permanently deleted. This cannot be undone.",
    deleteRequest: "Request account & data deletion",
    deleteConfirm: "⚠️ Confirm: delete all my data",
    deleting: "Deleting...",
    deleteDone: "Deletion request received. Redirecting shortly...",
    confirmHint: "Press the button once more to finalize",
    svcGroq: "Groq",
    svcGemini: "Gemini",
    svcCloudflare: "Cloudflare Workers AI",
    svcSupabase: "Supabase",
    svcDataGroq: "Conversation content (not retained)",
    svcDataGemini: "Text analysis (not retained)",
    svcDataCloudflare: "Image prompts (not retained)",
    svcDataSupabase: "Account, chats, memories (encrypted at rest)",
    svcPurposeGroq: "AI conversation",
    svcPurposeGemini: "Emotion / translation",
    svcPurposeCloudflare: "Image generation",
    svcPurposeSupabase: "Data storage",
  },
  ja: {
    title: "あなたのデータ",
    subtitle: "保存されたデータとプライバシー管理",
    storedEyebrow: "保存済みデータ",
    totalMessages: "総メッセージ数",
    totalMemories: "保存された記憶",
    thirdPartyEyebrow: "第三者AIサービス",
    thirdPartyBody: "GYEOLは以下のサービスにデータを送信します。各サービスのプライバシーポリシーが適用されます。",
    exportEyebrow: "データエクスポート (GDPR)",
    exportCta: "すべてのデータをダウンロード",
    deleteEyebrow: "データ削除 (GDPRの削除権)",
    deleteBody: "すべての会話、記憶、アカウント情報が永久に削除されます。元に戻せません。",
    deleteRequest: "アカウントとデータの削除を要求",
    deleteConfirm: "⚠️ 確認：すべてのデータを削除",
    deleting: "削除中...",
    deleteDone: "削除リクエストを受け付けました。まもなく移動します...",
    confirmHint: "もう一度ボタンを押して最終確認",
    svcGroq: "Groq",
    svcGemini: "Gemini",
    svcCloudflare: "Cloudflare Workers AI",
    svcSupabase: "Supabase",
    svcDataGroq: "会話内容 (保存しない)",
    svcDataGemini: "テキスト分析 (保存しない)",
    svcDataCloudflare: "画像プロンプト (保存しない)",
    svcDataSupabase: "アカウント、チャット、記憶 (暗号化保存)",
    svcPurposeGroq: "AI会話生成",
    svcPurposeGemini: "感情分析 / 翻訳",
    svcPurposeCloudflare: "画像生成",
    svcPurposeSupabase: "データ保存",
  },
  zh: {
    title: "我的数据",
    subtitle: "查看已存储的数据并管理隐私",
    storedEyebrow: "已存储的数据",
    totalMessages: "消息总数",
    totalMemories: "已存记忆",
    thirdPartyEyebrow: "第三方 AI 服务",
    thirdPartyBody: "GYEOL 会将数据发送给以下服务，各服务均有独立的隐私政策。",
    exportEyebrow: "数据导出 (GDPR)",
    exportCta: "下载我的所有数据",
    deleteEyebrow: "数据删除 (GDPR 删除权)",
    deleteBody: "所有对话、记忆和账户信息将被永久删除，此操作无法撤销。",
    deleteRequest: "请求删除账户与数据",
    deleteConfirm: "⚠️ 确认：删除我的所有数据",
    deleting: "删除中...",
    deleteDone: "删除请求已受理，稍后跳转...",
    confirmHint: "再按一次按钮确认",
    svcGroq: "Groq",
    svcGemini: "Gemini",
    svcCloudflare: "Cloudflare Workers AI",
    svcSupabase: "Supabase",
    svcDataGroq: "对话内容 (不保留)",
    svcDataGemini: "文本分析 (不保留)",
    svcDataCloudflare: "图像提示 (不保留)",
    svcDataSupabase: "账户、聊天、记忆 (加密存储)",
    svcPurposeGroq: "AI 对话",
    svcPurposeGemini: "情绪 / 翻译",
    svcPurposeCloudflare: "图像生成",
    svcPurposeSupabase: "数据存储",
  },
  es: {
    title: "Tus datos",
    subtitle: "Revisa los datos almacenados y controla tu privacidad",
    storedEyebrow: "Datos almacenados",
    totalMessages: "Mensajes totales",
    totalMemories: "Recuerdos guardados",
    thirdPartyEyebrow: "Servicios de IA de terceros",
    thirdPartyBody: "GYEOL envía datos a los servicios siguientes. Cada uno tiene su propia política de privacidad.",
    exportEyebrow: "Exportar datos (GDPR)",
    exportCta: "Descargar todos mis datos",
    deleteEyebrow: "Eliminar datos (derecho al olvido, GDPR)",
    deleteBody: "Se eliminarán permanentemente todas las conversaciones, recuerdos e información de cuenta. No se puede deshacer.",
    deleteRequest: "Solicitar eliminación de cuenta y datos",
    deleteConfirm: "⚠️ Confirmar: eliminar todos mis datos",
    deleting: "Eliminando...",
    deleteDone: "Solicitud recibida. Redirigiendo en breve...",
    confirmHint: "Pulsa el botón una vez más para confirmar",
    svcGroq: "Groq",
    svcGemini: "Gemini",
    svcCloudflare: "Cloudflare Workers AI",
    svcSupabase: "Supabase",
    svcDataGroq: "Contenido de la conversación (no retenido)",
    svcDataGemini: "Análisis de texto (no retenido)",
    svcDataCloudflare: "Prompts de imagen (no retenidos)",
    svcDataSupabase: "Cuenta, chats, recuerdos (cifrados en reposo)",
    svcPurposeGroq: "Conversación con IA",
    svcPurposeGemini: "Emoción / traducción",
    svcPurposeCloudflare: "Generación de imágenes",
    svcPurposeSupabase: "Almacenamiento de datos",
  },
};

export default function DataDashboardPage() {
  const { locale } = useTranslations();
  const loc = (["ko", "en", "ja", "zh", "es"].includes(locale) ? locale : "en") as keyof typeof COPY;
  const copy = COPY[loc];
  const [data, setData] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    // Fetch basic stats
    Promise.all([
      fetch("/api/wrapped").then((r) => r.json()),
    ]).then(([wrapped]) => {
      setData({
        totalMessages: wrapped.totalMessages ?? 0,
        totalMemories: wrapped.totalMemories ?? 0,
        accountCreatedAt: null,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleDeleteRequest = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await fetch("/api/gdpr/delete", { method: "POST" });
      if (res.ok) {
        setDeleted(true);
        setTimeout(() => { window.location.href = "/"; }, 3000);
      }
    } finally {
      setDeleting(false);
    }
  };

  const THIRD_PARTY_SERVICES = [
    { name: copy.svcGroq, purpose: copy.svcPurposeGroq, icon: "🤖", dataType: copy.svcDataGroq },
    { name: copy.svcGemini, purpose: copy.svcPurposeGemini, icon: "💡", dataType: copy.svcDataGemini },
    { name: copy.svcCloudflare, purpose: copy.svcPurposeCloudflare, icon: "☁️", dataType: copy.svcDataCloudflare },
    { name: copy.svcSupabase, purpose: copy.svcPurposeSupabase, icon: "🗄️", dataType: copy.svcDataSupabase },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{copy.title}</h1>
          <p className="mt-1 text-sm text-white/40">{copy.subtitle}</p>
        </div>

        {/* Data summary */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
            {copy.storedEyebrow}
          </p>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: copy.totalMessages, value: data?.totalMessages ?? 0, icon: "💬" },
                { label: copy.totalMemories, value: data?.totalMemories ?? 0, icon: "🧠" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-lg font-bold text-white">{item.value.toLocaleString()}</p>
                  <p className="text-[10px] text-white/40">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Third-party services */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
            {copy.thirdPartyEyebrow}
          </p>
          <p className="text-[10px] text-white/30 mb-4">
            {copy.thirdPartyBody}
          </p>
          <div className="space-y-2">
            {THIRD_PARTY_SERVICES.map((svc) => (
              <div key={svc.name} className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                <span className="text-lg">{svc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white">{svc.name}</span>
                    <span className="text-[10px] text-white/30">· {svc.purpose}</span>
                  </div>
                  <p className="text-[10px] text-white/25 mt-0.5">{svc.dataType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export data */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            {copy.exportEyebrow}
          </p>
          <div className="space-y-2">
            <a
              href="/api/gdpr/export"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60 hover:bg-white/[0.08] transition-colors"
            >
              <span className="text-base">📦</span>
              <span>{copy.exportCta}</span>
            </a>
            <a
              href="/api/export/conversations?format=markdown"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60 hover:bg-white/[0.08] transition-colors"
            >
              <span className="text-base">💬</span>
              <span>{loc === "ko" ? "대화 내역 내보내기 (Markdown)" : "Export Conversations (Markdown)"}</span>
            </a>
            <a
              href="/api/export/conversations?format=json"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60 hover:bg-white/[0.08] transition-colors"
            >
              <span className="text-base">📄</span>
              <span>{loc === "ko" ? "대화 내역 내보내기 (JSON)" : "Export Conversations (JSON)"}</span>
            </a>
          </div>
        </div>

        {/* Delete account */}
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-5">
          <p className="text-xs font-semibold text-rose-400/70 uppercase tracking-widest mb-2">
            {copy.deleteEyebrow}
          </p>
          <p className="text-xs text-white/40 mb-4">
            {copy.deleteBody}
          </p>

          {deleted ? (
            <motion.div
              className="text-center py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-rose-400 text-sm">{copy.deleteDone}</p>
            </motion.div>
          ) : (
            <button
              onClick={handleDeleteRequest}
              disabled={deleting}
              className={`w-full rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                deleteConfirm
                  ? "bg-rose-500/30 border border-rose-400/50 text-rose-300"
                  : "bg-white/[0.04] border border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              {deleting
                ? copy.deleting
                : deleteConfirm
                ? copy.deleteConfirm
                : copy.deleteRequest}
            </button>
          )}
          {deleteConfirm && !deleted && (
            <p className="text-[10px] text-rose-400/60 mt-2 text-center">
              {copy.confirmHint}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
