import React, { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { BASE_URL } from "../api/client";

const MAX_DIMENSION = 256;

function resizeImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Row({ label, description, action }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border dark:border-white/10 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink dark:text-white">{label}</p>
        {description && <p className="text-sm text-ink-soft dark:text-white/50 mt-0.5 truncate">{description}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export default function Settings() {
  const { openMobileNav } = useOutletContext();
  const { logout, user, updateAvatar, removeAvatar } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large. Please choose one under 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await updateAvatar(dataUrl);
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err.message || "Couldn't update your profile picture.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    try {
      await removeAvatar();
      toast.success("Profile picture removed.");
    } catch (err) {
      toast.error(err.message || "Couldn't remove your profile picture.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your account and workspace preferences" onMenuClick={openMobileNav} />

      <div className="px-5 sm:px-8 py-6 max-w-2xl space-y-6">
        <Card className="p-5">
          <h2 className="font-display font-semibold text-ink dark:text-white mb-4">Profile</h2>

          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.username}
                  className="w-20 h-20 rounded-full object-cover border border-border dark:border-white/10"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-light dark:bg-primary/20 text-primary flex items-center justify-center font-display font-semibold text-2xl">
                  {(user?.username || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="animate-spin">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                    <path d="M22 12a10 10 0 0 0-10-10" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="font-display font-semibold text-ink dark:text-white truncate">{user?.username || "—"}</p>
              <p className="text-sm text-ink-soft dark:text-white/50 truncate">{user?.email || "—"}</p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors focus-ring disabled:opacity-60"
                >
                  {user?.avatar ? "Change photo" : "Upload photo"}
                </button>
                {user?.avatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-ink-soft dark:text-white/60 hover:bg-bg dark:hover:bg-white/5 transition-colors focus-ring disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
          </div>

          <div className="mt-2">
            <Row label="Username" description={user?.username || "—"} />
            <Row
              label="Registered email"
              description={user?.email || "—"}
              action={
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-bg dark:bg-white/5 text-ink-soft dark:text-white/50 border border-border dark:border-white/10">
                  {user?.auth_provider === "google" ? "Google account" : "Password account"}
                </span>
              }
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-ink dark:text-white mb-1">Session</h2>
          <Row
            label="Sign out"
            description="End your current session on this device."
            action={
              <button
                onClick={logout}
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-bad/30 text-bad hover:bg-bad/5 transition-colors focus-ring"
              >
                Sign out
              </button>
            }
          />
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-ink dark:text-white mb-1">Appearance</h2>
          <Row
            label="Theme"
            description={theme === "dark" ? "Dark mode is on" : "Light mode is on"}
            action={
              <button
                onClick={toggle}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors focus-ring"
              >
                Switch to {theme === "dark" ? "light" : "dark"}
              </button>
            }
          />
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-ink dark:text-white mb-1">Connection</h2>
          <Row
            label="API base URL"
            description="The InsightAI backend this app talks to. Set via VITE_API_BASE_URL."
            action={<code className="text-xs font-mono bg-bg dark:bg-white/5 border border-border dark:border-white/10 px-2.5 py-1.5 rounded-md text-ink-soft dark:text-white/60">{BASE_URL}</code>}
          />
          <Row
            label="Copy API URL"
            description="Handy for debugging with curl or Postman."
            action={
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(BASE_URL);
                  toast.success("Copied to clipboard.");
                }}
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-border dark:border-white/10 bg-white dark:bg-transparent text-ink dark:text-white hover:bg-bg dark:hover:bg-white/5 transition-colors focus-ring"
              >
                Copy
              </button>
            }
          />
        </Card>
      </div>
    </div>
  );
}
