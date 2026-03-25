import {
  adviceHasAnyContent,
  adviceSectionsForEntry,
  dayEntriesChronological,
} from '../lib/nutrition'
import { groupRecommendationLines } from '../lib/advice-categories'
import { useFood } from '../context/FoodContext'

export function AdviceTab({ onOpenLightbox }: { onOpenLightbox?: (src: string) => void }) {
  const { state, dateKeyStr } = useFood()
  const meals = dayEntriesChronological(dateKeyStr, state.logsByDate)
  const hasMeals = meals.length > 0

  return (
    <div className="tab-panel tab-panel--advice">
      <article className="surface surface--elevated surface--full">
        <div className="surface__head">
          <h2 className="surface__title">คำแนะนำสำหรับวันที่เลือก</h2>
          <p className="surface__sub">
            แยกตามมื้อแต่ละภาพ — คำแนะนำจัดเป็นหมวดอ่านง่าย; แตะ &quot;ประโยชน์และข้อควรระวัง&quot; เพื่อขยาย
          </p>
        </div>
        {!hasMeals ? (
          <p className="advice-empty muted">
            ยังไม่มีมื้อในวันนี้ — ลองเพิ่มมื้อจากภาพเพื่อรับคำแนะนำจาก Gemini
          </p>
        ) : (
          <div className="advice-meals">
            {meals.map((e, mealIndex) => {
              const { recommendations, benefits, warnings } = adviceSectionsForEntry(e)
              const recGroups = groupRecommendationLines(recommendations)
              const hasText = adviceHasAnyContent({ recommendations, benefits, warnings })
              const time = new Date(e.createdAt).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const kcal = e.nutrition != null ? Math.round(e.nutrition.calories) : null

              return (
                <section key={e.id} className="advice-meal" aria-labelledby={`advice-meal-${e.id}`}>
                  <div className="advice-meal__top">
                    {e.thumbDataUrl ? (
                      <button
                        type="button"
                        className="advice-meal__thumb-btn"
                        onClick={() => onOpenLightbox?.(e.thumbDataUrl!)}
                        aria-label={`ดูภาพมื้อที่ ${mealIndex + 1} แบบเต็ม`}
                      >
                        <img src={e.thumbDataUrl} alt="" className="advice-meal__thumb" />
                      </button>
                    ) : (
                      <div className="advice-meal__thumb advice-meal__thumb--ph" aria-hidden />
                    )}
                    <div className="advice-meal__head">
                      <p id={`advice-meal-${e.id}`} className="advice-meal__title">
                        <span className="advice-meal__badge">มื้อที่ {mealIndex + 1}</span>
                        <span className="advice-meal__time">{time}</span>
                      </p>
                      <p className="advice-meal__label">{e.label}</p>
                      {kcal != null && (
                        <p className="advice-meal__kcal muted small">
                          ประมาณ <strong>{kcal}</strong> kcal
                        </p>
                      )}
                    </div>
                  </div>

                  {!hasText ? (
                    <p className="advice-meal__none muted small">ไม่มีข้อความคำแนะนำสำหรับมื้อนี้</p>
                  ) : (
                    <>
                      {recommendations.length > 0 ? (
                        <div className="advice-meal__block">
                          <h3 className="advice-meal__h">คำแนะนำจากมื้อนี้</h3>
                          <div className="advice-meal__cats">
                            {recGroups.map((block) => (
                              <div key={block.id} className="advice-meal__cat">
                                <h4 className="advice-meal__cat-title">{block.title}</h4>
                                <ol className="advice-list advice-list--compact advice-list--cat">
                                  {block.items.map((t) => (
                                    <li key={`${block.id}-${t}`}>{t}</li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {benefits.length > 0 || warnings.length > 0 ? (
                        <details className="advice-meal__details">
                          <summary className="advice-meal__details-sum">
                            ประโยชน์และข้อควรระวังจากมื้อนี้
                          </summary>
                          <div className="advice-meal__details-body">
                            {benefits.length > 0 && (
                              <div className="advice-meal__sub">
                                <p className="advice-meal__sub-h">ประโยชน์</p>
                                <ul className="advice-list advice-list--unordered advice-list--compact">
                                  {benefits.map((t) => (
                                    <li key={t}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {warnings.length > 0 && (
                              <div className="advice-meal__sub">
                                <p className="advice-meal__sub-h advice-meal__sub-h--warn">ข้อควรระวัง</p>
                                <ul className="advice-list advice-list--unordered advice-list--warn advice-list--compact">
                                  {warnings.map((t) => (
                                    <li key={t}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </details>
                      ) : null}
                    </>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </article>
    </div>
  )
}
