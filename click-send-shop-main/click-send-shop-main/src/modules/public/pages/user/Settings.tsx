import { formatDateTime } from "@/utils/formatDateTime";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Camera, MessageCircle, Phone, UserRound } from "lucide-react";
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
import StableImage from "@/components/ui/StableImage";
import { usePublicLocale } from "@/i18n/publicLocale";

const CARD = "store-settings-v12-card";
const SECTION_TITLE = "store-settings-v12-section-title";
const SOFT_INPUT = "store-settings-v12-input";
const FIELD_LABEL = "store-settings-v12-field-label";
const DIVIDER = "store-settings-v12-divider";

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="store-settings-v12-section">
      <h2 className={SECTION_TITLE}>{title}</h2>
      <div className={CARD}>{children}</div>
    </section>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="store-settings-v12-icon">
      {children}
    </span>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
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

  useEffect(() => {
    loadProfile().catch(() => {});
  }, [loadProfile]);

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
      navigate(localizedPath("/settings"), { replace: true });
      return;
    }
    if (bindResult === "success") {
      toast.success("微信已绑定", toastPresetQuickSuccess);
      loadWechatBinding();
      loadProfile().catch(() => {});
      navigate(localizedPath("/settings"), { replace: true });
    }
  }, [localizedPath, searchParams, navigate, loadProfile]);

  const handleBindWechat = async () => {
    setWechatActionLoading(true);
    try {
      await meService.startBindWechat(localizedPath("/settings"));
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
  const contactItemsReady = [phone, wechat, whatsapp].filter((value) => Boolean(value?.trim())).length;
  const birthdayStatus = birthdayReadOnly ? "已保存" : birthday ? "待保存" : "未填写";
  const wechatStatus = THIRD_PARTY_LOGIN_ENABLED && wechatLoginEnabled
    ? (wechatBinding.bound ? "已绑定" : "可绑定")
    : "未开启";

  return (
    <StoreAccountLayout
      title="账户设置"
      onBack={goBack}
      className="sf-next-page store-v12-page store-account-subpage-v12-page store-settings-v12-page text-[var(--theme-text)]"
      mainClassName="sf-next-account-main store-settings-v12-main pb-8 pt-3 sm:py-5 md:pb-12"
    >
      <div className="space-y-4 sm:space-y-5">
        <section className="store-account-v12-hero store-settings-v12-hero">
          <div className="store-settings-v12-identity">
            <UnifiedButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={profileSaving}
              className="store-settings-v12-avatar disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="更换头像"
            >
              <span className="store-settings-v12-avatar__media">
                {avatar ? (
                  <StableImage src={avatar} alt="头像" className="h-full w-full" imgClassName="object-cover" />
                ) : (
                  <span className="store-settings-v12-avatar__initial">{avatarInitial}</span>
                )}
              </span>
              <span className="store-settings-v12-avatar__camera">
                <Camera size={15} aria-hidden />
              </span>
            </UnifiedButton>
            <div className="min-w-0">
              <h2 title={userName}>{userName}</h2>
              <p>个人资料</p>
            </div>
          </div>
          <div className="store-v12-status-strip store-settings-v12-status-strip" aria-label="账户状态">
            <span>
              <b>联系方式</b>
              <strong>{contactItemsReady}/3</strong>
            </span>
            <span>
              <b>生日</b>
              <strong>{birthdayStatus}</strong>
            </span>
            <span>
              <b>微信</b>
              <strong>{wechatStatus}</strong>
            </span>
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
              <span className={FIELD_LABEL}>昵称</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={SOFT_INPUT}
                aria-label="昵称"
              />
            </label>
          </div>

          <div className={DIVIDER}>
            <div className="flex gap-3">
              <IconBubble>
                <CalendarDays size={20} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <span className={FIELD_LABEL}>生日</span>
                <SegmentedDateInput
                  value={birthday}
                  readOnly={birthdayReadOnly}
                  onChange={setBirthday}
                  controlClassName="store-settings-v12-date-input"
                />
                {birthdayReadOnly ? (
                  <p className="store-settings-v12-field-hint">生日已保存，如需修改请联系客服</p>
                ) : birthday ? (
                  <p className="store-settings-v12-field-hint">生日保存后不可自行修改</p>
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
              <span className={FIELD_LABEL}>手机号</span>
              <CountryPhoneInput
                countryCode={accountPhone.countryCode}
                onCountryCodeChange={() => {}}
                phone={accountPhone.phone}
                onPhoneChange={() => {}}
                readOnly
                variant="joined"
                showErrorText={false}
                className="store-settings-v12-phone-input"
              />
            </div>
          </div>

          <div className={DIVIDER}>
            <div className="flex gap-3">
              <IconBubble>
                <WeChatIcon size={20} />
              </IconBubble>
              <label className="min-w-0 flex-1">
                <span className={FIELD_LABEL}>联系微信号</span>
                <input
                  value={wechat}
                  onChange={(e) => setWechat(e.target.value)}
                  className={SOFT_INPUT}
                  aria-label="联系微信号"
                />
              </label>
            </div>
          </div>

          <div className={DIVIDER}>
            <div className="flex gap-3">
              <IconBubble>
                <MessageCircle size={20} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <span className={FIELD_LABEL}>WhatsApp</span>
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
                  className="store-settings-v12-phone-input"
                  autoDetectCountryCode
                />
              </div>
            </div>
          </div>

          <p className="store-settings-v12-help-note">
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
              <StableImage
                src={wechatBinding.avatarUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full"
                imgClassName="rounded-full object-cover"
              />
            ) : null}
          </div>

          <div className="mt-4">
            {wechatBinding.bound ? (
              <UnifiedButton
                type="button"
                onClick={handleUnbindWechat}
                disabled={wechatActionLoading}
                className="store-settings-v12-oauth-button store-settings-v12-oauth-button--danger"
              >
                {wechatActionLoading ? "处理中..." : "解绑微信"}
              </UnifiedButton>
            ) : (
              <UnifiedButton
                type="button"
                onClick={handleBindWechat}
                disabled={wechatActionLoading}
                className="store-settings-v12-oauth-button store-settings-v12-oauth-button--wechat"
              >
                <WeChatIcon size={20} />
                {wechatActionLoading ? "跳转中..." : "绑定微信"}
              </UnifiedButton>
            )}
          </div>
          <p className="store-settings-v12-field-hint">
            解绑前请确保已绑定手机号或设置密码，否则可能无法登录。
          </p>
        </SectionBlock>
      )}

      <SettingsSecuritySection />
      </div>

      <div className="store-settings-v12-save-bar">
        <div className="store-settings-v12-save-bar__inner">
          <UnifiedButton
            onClick={handleSave}
            disabled={profileSaving}
            className="store-settings-v12-save-button"
          >
            {profileSaving ? "保存中..." : "保存修改"}
          </UnifiedButton>
        </div>
      </div>
    </StoreAccountLayout>
  );
}
