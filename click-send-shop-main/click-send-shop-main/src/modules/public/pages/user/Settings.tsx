import { formatDateTime } from "@/utils/formatDateTime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import WeChatIcon from "@/components/icons/WeChatIcon";
import { THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";
import * as meService from "@/services/meService";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { toastErrorMessage } from "@/utils/errorMessage";
import * as uploadService from "@/services/uploadService";
import * as userService from "@/services/userService";
import * as authService from "@/services/authService";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import SettingsSecuritySection from "@/modules/public/pages/user/SettingsSecuritySection";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import CountryPhoneInput from "@/components/auth/CountryPhoneInput";
import {
  buildIntlPhone,
  splitPhoneForInput,
  validatePhoneForCountry,
  type SupportedCountryCode,
} from "@/utils/authValidation";
import { normalizeBirthdayValue, resolveBirthdayLockedState } from "@/utils/birthday";

const CARD = "rounded-2xl bg-[var(--theme-surface)] px-[var(--store-card-x)] py-[var(--store-card-y)] shadow-[var(--theme-shadow)] sm:p-4";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goBack = useGoBack();
  const { nickname, phone, avatar, wechat, whatsapp, profileSaving, setNickname, setWechat, setAvatar, loadProfile } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wechatBinding, setWechatBinding] = useState<{ bound: boolean; nickname?: string | null; avatarUrl?: string | null; boundAt?: string }>({ bound: false });
  const [wechatLoginEnabled, setWechatLoginEnabled] = useState(false);
  const [wechatActionLoading, setWechatActionLoading] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [savedBirthday, setSavedBirthday] = useState("");
  const [birthdayLocked, setBirthdayLocked] = useState(false);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState<SupportedCountryCode>("+60");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ whatsapp?: string }>({});
  const accountPhone = useMemo(() => splitPhoneForInput(phone), [phone]);

  useEffect(() => {
    const parsed = splitPhoneForInput(whatsapp);
    setWhatsappCountryCode(parsed.countryCode);
    setWhatsappPhone(parsed.phone);
  }, [whatsapp]);

  const loadWechatBinding = async () => {
    try {
      const data = await meService.fetchWechatBinding();
      setWechatBinding({
        bound: data.bound,
        nickname: data.nickname,
        avatarUrl: data.avatarUrl,
        boundAt: data.boundAt,
      });
      setWechatLoginEnabled(Boolean(data.wechatLoginEnabled));
    } catch {
      setWechatBinding({ bound: false });
    }
  };

  useEffect(() => {
    if (!THIRD_PARTY_LOGIN_ENABLED) return;
    loadWechatBinding();
  }, []);

  useEffect(() => {
    if (!THIRD_PARTY_LOGIN_ENABLED) return;
    const bindResult = searchParams.get("wechatBind");
    const wechatErr = searchParams.get("wechatError");
    if (wechatErr) {
      toast.error(decodeURIComponent(wechatErr.replace(/\+/g, " ")));
      navigate("/settings", { replace: true });
      return;
    }
    if (bindResult === "success") {
      toast.success("微信已绑定", toastPresetQuickSuccess);
      loadWechatBinding();
      loadProfile().catch(() => {});
      navigate("/settings", { replace: true });
    }
  }, [searchParams, navigate, loadProfile]);

  const handleBindWechat = async () => {
    setWechatActionLoading(true);
    try {
      await meService.startBindWechat("/settings");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "无法发起绑定");
      setWechatActionLoading(false);
    }
  };

  const handleUnbindWechat = async () => {
    setWechatActionLoading(true);
    try {
      await meService.unbindWechat();
      await loadWechatBinding();
      toast.success("微信已解绑", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "解绑失败");
    } finally {
      setWechatActionLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previousAvatar = avatar;
    let uploaded = false;
    try {
      const data = await uploadService.uploadSingle(file, { mode: "thumb" });
      uploaded = true;
      setAvatar(data.url);
      await useUserStore.getState().saveProfile();
      toast.success("头像上传成功", toastPresetQuickSuccess);
    } catch (error) {
      if (uploaded) setAvatar(previousAvatar);
      toast.error(toastErrorMessage(error, uploaded ? "头像保存失败，请稍后重试" : "头像上传失败，请检查图片格式/大小后重试"));
    } finally {
      e.target.value = "";
    }
  };

  useEffect(() => {
    authService.getProfile().then((p) => {
      const normalizedBirthday = normalizeBirthdayValue(p.birthday);
      setBirthday(normalizedBirthday);
      setSavedBirthday(normalizedBirthday);
      setBirthdayLocked(resolveBirthdayLockedState(p));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    const whatsappError = whatsappPhone
      ? validatePhoneForCountry(whatsappPhone, whatsappCountryCode)
      : null;
    if (whatsappError) {
      setFieldErrors({ whatsapp: whatsappError });
      toast.error(whatsappError);
      return;
    }
    try {
      const normalizedWhatsapp = whatsappPhone ? buildIntlPhone(whatsappPhone, whatsappCountryCode) : "";
      const birthdayCanSubmit = Boolean(birthday && !savedBirthday && !birthdayLocked);
      const updatedProfile = await userService.updateProfile({
        nickname,
        avatar,
        wechat,
        whatsapp: normalizedWhatsapp,
        ...(normalizedWhatsapp ? { whatsappCountryCode } : {}),
        ...(birthdayCanSubmit ? { birthday } : {}),
      });
      const normalizedBirthday = normalizeBirthdayValue(updatedProfile.birthday);
      setBirthday(normalizedBirthday);
      setSavedBirthday(normalizedBirthday);
      setBirthdayLocked(resolveBirthdayLockedState(updatedProfile));
      await loadProfile();
      toast.success("资料已保存", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败，请重试");
    }
  };

  const birthdayReadOnly = Boolean(savedBirthday);

  return (
    <StoreAccountLayout title="账户设置" onBack={goBack} className="store-page text-[var(--theme-text)]" mainClassName="space-y-3 pb-24 sm:py-4 lg:pb-12">
        <section className={CARD}>
          <div className="flex flex-col items-center gap-4 py-1">
            {avatar ? (
              <div className="h-20 w-20 overflow-hidden rounded-full ring-1 ring-[var(--theme-border)]">
                <img src={avatar} alt="头像" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--theme-primary)] text-2xl font-bold text-[var(--theme-primary-foreground)]">
                {(nickname || "会员").trim().slice(0, 1).toUpperCase()}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={profileSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 text-sm font-semibold text-[var(--theme-text)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="更换头像"
            >
              <Camera size={16} />
              {profileSaving ? "保存中..." : "更换头像"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
        </section>

        {THIRD_PARTY_LOGIN_ENABLED && wechatLoginEnabled && (
          <section className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <WeChatIcon size={22} />
                <div>
                  <p className="text-sm font-medium">微信登录</p>
                  <p className="mt-0.5 text-xs text-[var(--theme-muted)]">
                    {wechatBinding.bound
                      ? `已绑定${wechatBinding.nickname ? `：${wechatBinding.nickname}` : ""}`
                      : "绑定后可使用微信扫码登录"}
                  </p>
                </div>
              </div>
              {wechatBinding.bound && wechatBinding.avatarUrl ? (
                <img src={wechatBinding.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : null}
            </div>
            {wechatBinding.bound && wechatBinding.boundAt ? (
              <p className="mt-2 text-[11px] text-[var(--theme-muted)]">
                绑定时间：{formatDateTime(wechatBinding.boundAt)}
              </p>
            ) : null}
            <div className="mt-4">
              {wechatBinding.bound ? (
                <button
                  type="button"
                  onClick={handleUnbindWechat}
                  disabled={wechatActionLoading}
                  className="w-full rounded-xl border border-[color-mix(in_srgb,var(--theme-danger)_35%,transparent)] py-2.5 text-sm font-medium text-[var(--theme-danger)] disabled:opacity-60"
                >
                  {wechatActionLoading ? "处理中..." : "解绑微信"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBindWechat}
                  disabled={wechatActionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#075E54]/30 bg-[#075E54] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <WeChatIcon size={20} />
                  {wechatActionLoading ? "跳转中..." : "绑定微信"}
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--theme-muted)]">
              解绑前请确保已绑定手机号或设置密码，否则可能无法登录。
            </p>
          </section>
        )}

        <section className={CARD}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-[var(--theme-muted)]">昵称</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="h-11 w-full rounded-xl bg-[var(--theme-bg)] px-4 text-sm outline-none ring-1 ring-[var(--theme-border)] focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-70"
              />
            </label>
            <div>
              <span className="mb-1.5 block text-xs text-[var(--theme-muted)]">手机号</span>
              <CountryPhoneInput
                countryCode={accountPhone.countryCode}
                onCountryCodeChange={() => {}}
                phone={accountPhone.phone}
                onPhoneChange={() => {}}
                readOnly
              />
              <p className="mt-1 text-[11px] text-[var(--theme-muted)]">手机号用于登录，如需修改请联系客服</p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs text-[var(--theme-muted)]">联系微信号</span>
              <input
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
                className="h-11 w-full rounded-xl bg-[var(--theme-bg)] px-4 text-sm outline-none ring-1 ring-[var(--theme-border)] focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-70"
              />
            </label>
            <div>
              <span className="mb-1.5 block text-xs text-[var(--theme-muted)]">WhatsApp</span>
              <CountryPhoneInput
                countryCode={whatsappCountryCode}
                onCountryCodeChange={(value) => {
                  setWhatsappCountryCode(value);
                  if (fieldErrors.whatsapp) setFieldErrors((prev) => ({ ...prev, whatsapp: undefined }));
                }}
                phone={whatsappPhone}
                onPhoneChange={(value) => {
                  setWhatsappPhone(value);
                  if (fieldErrors.whatsapp) setFieldErrors((prev) => ({ ...prev, whatsapp: undefined }));
                }}
                errorText={fieldErrors.whatsapp}
                phonePlaceholder="WhatsApp 号码"
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs text-[var(--theme-muted)]">生日</span>
              <SegmentedDateInput
                value={birthday}
                readOnly={birthdayReadOnly}
                onChange={setBirthday}
                controlClassName="h-11 rounded-xl border-0 bg-[var(--theme-bg)] px-4 text-[var(--theme-text)] ring-1 ring-[var(--theme-border)] focus-within:ring-2 focus-within:ring-[var(--theme-primary)]"
              />
              {birthdayReadOnly ? (
                <p className="mt-1 text-[11px] text-[var(--theme-muted)]">生日已保存，如需修改请联系客服</p>
              ) : birthday ? (
                <p className="mt-1 text-[11px] text-[var(--theme-muted)]">生日保存后不可自行修改</p>
              ) : null}
            </label>
          </div>
        </section>

        <SettingsSecuritySection />

        <button onClick={handleSave} disabled={profileSaving} className="w-full rounded-full bg-[var(--theme-primary)] py-3.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
          {profileSaving ? "保存中..." : "保存修改"}
        </button>
    </StoreAccountLayout>
  );
}
