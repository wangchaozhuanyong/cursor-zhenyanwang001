import { formatDateTime } from "@/utils/formatDateTime";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Camera, ChevronRight, MessageCircle, Phone, UserRound } from "lucide-react";
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
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const CARD =
  "rounded-[1.25rem] border border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]";
const SECTION_TITLE = "px-1 text-[13px] font-semibold text-[var(--theme-text)]";
const SOFT_INPUT =
  "h-12 w-full rounded-[14px] border border-transparent bg-[var(--theme-bg)] px-4 text-sm font-medium text-[var(--theme-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--theme-muted)] focus:border-[color-mix(in_srgb,var(--theme-primary)_40%,var(--theme-border))] focus:shadow-[var(--theme-focus-ring)] disabled:opacity-70";

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className={SECTION_TITLE}>{title}</h2>
      <div className={CARD}>{children}</div>
    </section>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] text-[var(--theme-primary)]">
      {children}
    </span>
  );
}

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
  const userName = nickname?.trim() || "会员用户";
  const avatarInitial = userName.slice(0, 1).toUpperCase();

  return (
    <StoreAccountLayout
      title="账户设置"
      onBack={goBack}
      className="store-page bg-[var(--theme-bg)] text-[var(--theme-text)]"
      mainClassName="pb-28 pt-3 sm:py-5 lg:pb-12"
    >
      <div className="space-y-4 sm:space-y-5">
      <section className={`${CARD} overflow-hidden`}>
        <div className="flex items-center gap-4">
          <UnifiedButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={profileSaving}
            className="relative h-16 w-16 shrink-0 rounded-full p-0 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="更换头像"
          >
            <span className="block h-16 w-16 overflow-hidden rounded-full ring-1 ring-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))]">
              {avatar ? (
                <img src={avatar} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[var(--theme-primary)] text-2xl font-bold text-[var(--theme-primary-foreground)]">
                  {avatarInitial}
                </span>
              )}
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-primary)] shadow-sm">
              <Camera size={15} />
            </span>
          </UnifiedButton>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold leading-tight text-[var(--theme-text)]" title={userName}>
              {userName}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">管理你的个人资料与账户信息</p>
            <UnifiedButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={profileSaving}
              className="mt-3 inline-flex h-9 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-3 text-sm font-semibold text-[var(--theme-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileSaving ? "保存中..." : "更换头像"}
              <ChevronRight size={15} />
            </UnifiedButton>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
      </section>

      <SectionBlock title="基础信息">
        <div className="space-y-4">
          <div className="flex gap-3">
            <IconBubble>
              <UserRound size={20} />
            </IconBubble>
            <label className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--theme-text)]">昵称</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={`mt-2 ${SOFT_INPUT}`}
                aria-label="昵称"
              />
            </label>
          </div>

          <div className="border-t border-[color-mix(in_srgb,var(--theme-border)_68%,transparent)] pt-4">
            <div className="flex gap-3">
              <IconBubble>
                <CalendarDays size={20} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--theme-text)]">生日</span>
                <SegmentedDateInput
                  value={birthday}
                  readOnly={birthdayReadOnly}
                  onChange={setBirthday}
                  controlClassName="mt-2 h-12 rounded-[14px] border-0 bg-[var(--theme-bg)] px-4 text-[var(--theme-text)] ring-0 focus-within:shadow-[var(--theme-focus-ring)]"
                />
                {birthdayReadOnly ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--theme-muted)]">生日已保存，如需修改请联系客服</p>
                ) : birthday ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--theme-muted)]">生日保存后不可自行修改</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="联系方式">
        <div className="space-y-5">
          <div className="flex gap-3">
            <IconBubble>
              <Phone size={20} />
            </IconBubble>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--theme-text)]">手机号</span>
              <CountryPhoneInput
                countryCode={accountPhone.countryCode}
                onCountryCodeChange={() => {}}
                phone={accountPhone.phone}
                onPhoneChange={() => {}}
                readOnly
                variant="joined"
                showErrorText={false}
                className="mt-2"
              />
            </div>
          </div>

          <div className="border-t border-[color-mix(in_srgb,var(--theme-border)_68%,transparent)] pt-4">
            <div className="flex gap-3">
              <IconBubble>
                <WeChatIcon size={20} />
              </IconBubble>
              <label className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--theme-text)]">联系微信号</span>
                <input
                  value={wechat}
                  onChange={(e) => setWechat(e.target.value)}
                  className={`mt-2 ${SOFT_INPUT}`}
                  aria-label="联系微信号"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-[color-mix(in_srgb,var(--theme-border)_68%,transparent)] pt-4">
            <div className="flex gap-3">
              <IconBubble>
                <MessageCircle size={20} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--theme-text)]">WhatsApp</span>
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
                  variant="joined"
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <p className="rounded-[14px] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-bg))] px-3 py-2 text-xs leading-5 text-[var(--theme-muted)]">
            手机号用于登录，如需修改请联系客服。
          </p>
        </div>
      </SectionBlock>

      {THIRD_PARTY_LOGIN_ENABLED && wechatLoginEnabled && (
        <SectionBlock title="登录方式">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <IconBubble>
                <WeChatIcon size={20} />
              </IconBubble>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--theme-text)]">微信登录</p>
                <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">
                  {wechatBinding.bound
                    ? `已绑定${wechatBinding.nickname ? `：${wechatBinding.nickname}` : ""}`
                    : "绑定后可使用微信扫码登录"}
                </p>
                {wechatBinding.bound && wechatBinding.boundAt ? (
                  <p className="mt-1 text-[11px] leading-5 text-[var(--theme-muted)]">
                    绑定时间：{formatDateTime(wechatBinding.boundAt)}
                  </p>
                ) : null}
              </div>
            </div>
            {wechatBinding.bound && wechatBinding.avatarUrl ? (
              <img src={wechatBinding.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : null}
          </div>

          <div className="mt-4">
            {wechatBinding.bound ? (
              <UnifiedButton
                type="button"
                onClick={handleUnbindWechat}
                disabled={wechatActionLoading}
                className="h-11 w-full rounded-[14px] border border-[color-mix(in_srgb,var(--theme-danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--theme-danger)_5%,var(--theme-surface))] text-sm font-semibold text-[var(--theme-danger)] disabled:opacity-60"
              >
                {wechatActionLoading ? "处理中..." : "解绑微信"}
              </UnifiedButton>
            ) : (
              <UnifiedButton
                type="button"
                onClick={handleBindWechat}
                disabled={wechatActionLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[color-mix(in_srgb,#075E54_92%,var(--theme-primary))] text-sm font-semibold text-white disabled:opacity-60"
              >
                <WeChatIcon size={20} />
                {wechatActionLoading ? "跳转中..." : "绑定微信"}
              </UnifiedButton>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--theme-muted)]">
            解绑前请确保已绑定手机号或设置密码，否则可能无法登录。
          </p>
        </SectionBlock>
      )}

      <SettingsSecuritySection />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color-mix(in_srgb,var(--theme-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_92%,transparent)] px-[var(--store-page-x)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-0">
        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <UnifiedButton
            onClick={handleSave}
            disabled={profileSaving}
            className="h-12 w-full rounded-[16px] bg-[var(--theme-primary)] text-sm font-semibold text-[var(--theme-primary-foreground)] shadow-[0_12px_26px_-18px_var(--theme-primary)] disabled:opacity-60"
          >
            {profileSaving ? "保存中..." : "保存修改"}
          </UnifiedButton>
        </div>
      </div>
    </StoreAccountLayout>
  );
}
