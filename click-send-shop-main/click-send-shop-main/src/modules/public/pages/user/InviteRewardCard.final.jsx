import { ClipboardList, Gift, Send, TicketCheck } from 'lucide-react'
import './InviteRewardCard.final.css'
import heroImage from './assets/reward-hero.webp'

export default function InviteRewardCard({
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
        <div className="ir-content">
          <div className="ir-copy">
            <span className="ir-kicker">
              <Gift size={15} aria-hidden="true" />
              邀请奖励
            </span>
            <h2 className="ir-title">{title}</h2>
            <p className="ir-subtitle">{subtitle}</p>
          </div>
          <img className="ir-hero" src={heroSrc} alt="红包金币礼盒奖励插画" />
        </div>

        <div className="ir-stats" aria-label="邀请奖励统计">
          <div className="ir-stat">
            <span className="ir-statLabel">已邀请</span>
            <span className="ir-statValue">{invitedCount} 人</span>
          </div>
          <div className="ir-stat">
            <span className="ir-statLabel">可用返现</span>
            <span className="ir-statValue">{cashbackAmount}</span>
          </div>
        </div>

        <div className="ir-actions">
          <button className="ir-action ir-action--primary" type="button" onClick={onInvite}>
            <Send size={16} aria-hidden="true" />
            <span>立即邀请</span>
          </button>

          <button className="ir-action ir-action--secondary" type="button" onClick={onCode}>
            <TicketCheck size={16} aria-hidden="true" />
            <span>邀请码</span>
          </button>

          <button className="ir-action ir-action--secondary" type="button" onClick={onRecords}>
            <ClipboardList size={16} aria-hidden="true" />
            <span>记录</span>
          </button>
        </div>
      </div>
    </section>
  )
}
