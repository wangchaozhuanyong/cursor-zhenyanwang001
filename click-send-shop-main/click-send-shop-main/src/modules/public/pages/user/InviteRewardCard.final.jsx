import './InviteRewardCard.final.css'
import heroImage from './assets/reward-hero.webp'

export default function InviteRewardCard({
  badgeText = '邀请奖励',
  title = '邀请好友得奖励',
  subtitle = '好友完成首单后，返现自动入账；奖励明细、邀请码和邀请记录集中管理。',
  invitedCount = 0,
  cashbackAmount = 'RM 0.00',
  heroSrc = heroImage,
  onInvite,
  onCode,
  onRecords,
}) {
  return (
    <section className="ir-stage" aria-label="邀请好友得奖励">
      <div className="ir-card">
        <div className="ir-safe-overlay" />

        <div className="ir-badge">
          <span className="ir-badgeIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.1 17.2h15.8l-.9 2H5l-.9-2Zm.9-9.9 4.2 3.7 2.9-5.6 3.2 5.1 4.1-3.2-1.7 8.2H6.8L5 7.3Z" />
            </svg>
          </span>
          <span className="ir-badgeText">{badgeText}</span>
        </div>

        <h1 className="ir-title">{title}</h1>
        <p className="ir-subtitle">{subtitle}</p>

        <div className="ir-stats">
          <div className="ir-stat">
            <span className="ir-statIcon ir-statIcon--teal" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="3.15" />
                <path d="M4.6 19.3c1.6-3.65 4.25-5.48 7.4-5.48s5.8 1.83 7.4 5.48" />
              </svg>
            </span>
            <span className="ir-statLabel">已邀请</span>
            <span className="ir-statValue">{invitedCount} 人</span>
          </div>

          <div className="ir-stat">
            <span className="ir-statIcon ir-statIcon--gold" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 8.2h12.9c1.15 0 2.1.95 2.1 2.1v5.2c0 1.15-.95 2.1-2.1 2.1H5.6a2.1 2.1 0 0 1-2.1-2.1V8.2Z" />
                <path d="M5.7 6.2h9.6" />
                <path d="M15.2 10.5h5.3v4.8h-5.3a2.4 2.4 0 0 1 0-4.8Z" />
                <circle cx="15.6" cy="12.9" r=".55" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="ir-statLabel">可用返现</span>
            <span className="ir-statValue">{cashbackAmount}</span>
          </div>
        </div>

        <div className="ir-actions">
          <button className="ir-action ir-action--primary" type="button" onClick={onInvite}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            </svg>
            <span>立即邀请</span>
          </button>

          <button className="ir-action ir-action--secondary" type="button" onClick={onCode}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" />
              <path d="M14 2v5h5" />
              <path d="m10 13-2 2 2 2" />
              <path d="m14 13 2 2-2 2" />
              <path d="m13 12-2 6" />
            </svg>
            <span>邀请码</span>
          </button>

          <button className="ir-action ir-action--secondary" type="button" onClick={onRecords}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="4" width="14" height="16" rx="2" />
              <path d="M9 9h6" />
              <path d="M9 13h6" />
              <path d="M9 17h4" />
            </svg>
            <span>记录</span>
          </button>
        </div>

        <img className="ir-hero" src={heroSrc} alt="红包金币礼盒奖励插画" />
      </div>
    </section>
  )
}
