(() => {
  const STORAGE_KEY = "food-ai-dashboard-v1";
  const RING_R = 52;
  const RING_C = 2 * Math.PI * RING_R;

  const defaultGoals = () => ({
    calories: 2829,
    protein: 212,
    carbs: 283,
    fat: 94,
    waterMl: 2500,
  });

  const defaultState = () => ({
    goals: defaultGoals(),
    logsByDate: {},
    waterByDate: {},
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const p = JSON.parse(raw);
      return {
        goals: { ...defaultGoals(), ...p.goals },
        logsByDate: p.logsByDate || {},
        waterByDate: p.waterByDate || {},
      };
    } catch {
      return defaultState();
    }
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function dateKey(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseKey(k) {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function ordinalDay(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function formatHeaderDate(d) {
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const day = ordinalDay(d.getDate());
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  let viewDate = new Date();
  viewDate.setHours(0, 0, 0, 0);

  const el = {
    dateLabel: document.getElementById("date-label"),
    datePrev: document.getElementById("date-prev"),
    dateNext: document.getElementById("date-next"),
    calRingFg: document.getElementById("cal-ring-fg"),
    calPct: document.getElementById("cal-pct"),
    calConsumed: document.getElementById("cal-consumed"),
    calGoal: document.getElementById("cal-goal"),
    calRemain: document.getElementById("cal-remain"),
    macroPCurr: document.getElementById("macro-p-curr"),
    macroPGoal: document.getElementById("macro-p-goal"),
    macroCCurr: document.getElementById("macro-c-curr"),
    macroCGoal: document.getElementById("macro-c-goal"),
    macroFCurr: document.getElementById("macro-f-curr"),
    macroFGoal: document.getElementById("macro-f-goal"),
    diaryEmpty: document.getElementById("diary-empty"),
    diaryList: document.getElementById("diary-list"),
    waterFill: document.getElementById("water-fill"),
    waterPct: document.getElementById("water-pct"),
    waterGoalLabel: document.getElementById("water-goal-label"),
    wkCal: document.getElementById("wk-cal"),
    wkP: document.getElementById("wk-p"),
    wkC: document.getElementById("wk-c"),
    wkF: document.getElementById("wk-f"),
    chat: document.getElementById("chat"),
    chatWelcome: document.getElementById("chat-welcome"),
    chatFile: document.getElementById("chat-file"),
    chatAttachBtn: document.getElementById("chat-attach-btn"),
    chatPending: document.getElementById("chat-pending"),
    chatPendingThumb: document.getElementById("chat-pending-thumb"),
    chatPendingName: document.getElementById("chat-pending-name"),
    chatPendingRemove: document.getElementById("chat-pending-remove"),
    chatText: document.getElementById("chat-text"),
    chatSend: document.getElementById("chat-send"),
    btnNewChat: document.getElementById("btn-new-chat"),
    modal: document.getElementById("modal-add"),
    modalDrop: document.getElementById("modal-drop"),
    modalFile: document.getElementById("modal-file"),
    modalPreview: document.getElementById("modal-preview"),
    modalPreviewImg: document.getElementById("modal-preview-img"),
    modalStatus: document.getElementById("modal-status"),
    modalAnalyze: document.getElementById("modal-analyze"),
    modalCancel: document.getElementById("modal-cancel"),
    modalClose: document.getElementById("modal-close"),
  };

  let chatPendingFile = null;
  let chatPendingObjectUrl = null;
  let modalFileObj = null;

  function clearChatPending() {
    if (chatPendingObjectUrl) {
      URL.revokeObjectURL(chatPendingObjectUrl);
      chatPendingObjectUrl = null;
    }
    chatPendingFile = null;
    el.chatFile.value = "";
    el.chatPending.hidden = true;
    el.chatPendingThumb.removeAttribute("src");
    el.chatPendingName.textContent = "";
    el.chatAttachBtn.classList.remove("btn-attach--ready");
  }

  function setChatPendingFromFile(f) {
    if (chatPendingObjectUrl) {
      URL.revokeObjectURL(chatPendingObjectUrl);
      chatPendingObjectUrl = null;
    }
    chatPendingFile = f || null;
    if (!f) {
      el.chatPending.hidden = true;
      el.chatPendingThumb.removeAttribute("src");
      el.chatPendingName.textContent = "";
      el.chatAttachBtn.classList.remove("btn-attach--ready");
      return;
    }
    chatPendingObjectUrl = URL.createObjectURL(f);
    el.chatPendingThumb.src = chatPendingObjectUrl;
    el.chatPendingName.textContent = f.name;
    el.chatPending.hidden = false;
    el.chatAttachBtn.classList.add("btn-attach--ready");
  }

  function resetChat() {
    clearChatPending();
    el.chatText.value = "";
    el.chat.innerHTML = "";
    const welcome = document.createElement("div");
    welcome.className = "chat__welcome muted small";
    welcome.id = "chat-welcome";
    welcome.textContent =
      "อัปโหลดรูปอาหารแล้วกดส่ง — ระบบจะเรียก API วิเคราะห์จริงจากเซิร์ฟเวอร์ของคุณ";
    el.chat.appendChild(welcome);
    el.chatWelcome = welcome;
  }

  function dailyTotals(key) {
    const entries = state.logsByDate[key] || [];
    let calories = 0,
      protein = 0,
      carbs = 0,
      fat = 0;
    for (const e of entries) {
      if (e.nutrition) {
        calories += e.nutrition.calories || 0;
        protein += e.nutrition.protein || 0;
        carbs += e.nutrition.carbs || 0;
        fat += e.nutrition.fat || 0;
      }
    }
    return { calories, protein, carbs, fat, entries: entries.length };
  }

  function addLogEntry(key, entry) {
    if (!state.logsByDate[key]) state.logsByDate[key] = [];
    state.logsByDate[key].unshift(entry);
    saveState();
  }

  function entryLabel(api) {
    const foods = api.detected_foods || [];
    if (!foods.length) return "มื้ออาหาร";
    return foods
      .map((f) => f.name)
      .slice(0, 3)
      .join(", ");
  }

  async function analyzeImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/v1/analyze/image", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.detail || data.message || res.statusText;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
  }

  function thumbDataUrl(file) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
  }

  function renderDiary(key) {
    const entries = state.logsByDate[key] || [];
    if (!entries.length) {
      el.diaryEmpty.hidden = false;
      el.diaryList.hidden = true;
      el.diaryList.innerHTML = "";
      return;
    }
    el.diaryEmpty.hidden = true;
    el.diaryList.hidden = false;
    el.diaryList.innerHTML = entries
      .map((e, idx) => {
        const cal = e.nutrition ? Math.round(e.nutrition.calories) : "—";
        const time = new Date(e.createdAt).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const img = e.thumbDataUrl
          ? `<img src="${e.thumbDataUrl}" alt="" />`
          : `<div class="diary-item__ph"></div>`;
        return `<li class="diary-item">
          ${img}
          <div class="diary-item__body">
            <p class="diary-item__title">${escapeHtml(e.label)}</p>
            <p class="diary-item__meta">${time}</p>
          </div>
          <div class="diary-item__right">
            <span class="diary-item__cal">${cal}</span>
            <button type="button" class="diary-item__delete" data-diary-index="${idx}" title="ลบรายการนี้" aria-label="ลบรายการนี้">
              <svg class="diary-item__delete-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6"/>
              </svg>
              <span class="diary-item__delete-label">ลบ</span>
            </button>
          </div>
        </li>`;
      })
      .join("");
  }

  el.diaryList.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".diary-item__delete");
    if (!btn) return;
    const raw = btn.dataset.diaryIndex ?? btn.getAttribute("data-diary-index");
    const idx = Number(raw);
    if (Number.isNaN(idx)) return;
    const key = dateKey(viewDate);
    const arr = state.logsByDate[key];
    if (!arr || idx < 0 || idx >= arr.length) return;
    arr.splice(idx, 1);
    if (arr.length === 0) delete state.logsByDate[key];
    saveState();
    renderDate();
  });

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  /** Turn **bold** into <strong> after escape; line breaks to <br> */
  function formatExplainedText(raw) {
    if (!raw) return "";
    const esc = escapeHtml(raw);
    const br = esc.replace(/\n/g, "<br/>");
    return br.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function formatAssistantReply(data) {
    const parts = [];

    if (data.annotated_image) {
      const src = data.annotated_image.startsWith("data:")
        ? data.annotated_image
        : `data:image/jpeg;base64,${data.annotated_image}`;
      parts.push(
        `<div class="msg-visual"><img src="${src}" alt="ภาพที่ตรวจจับ" /></div>`
      );
    }

    const foods = data.detected_foods || [];
    if (foods.length) {
      const list = foods
        .map((f) => {
          const g = f.food_group ? ` (${f.food_group})` : "";
          return `${f.name}${g}`;
        })
        .join(" · ");
      parts.push(
        `<div class="msg-section"><p class="msg-lead">รายการที่ตรวจพบ</p><p class="msg-plain">${escapeHtml(list)}</p></div>`
      );
    }

    const n = data.total_nutrition;
    if (n) {
      const cal = Math.round(n.calories);
      const p = Number(n.protein).toFixed(1);
      const c = Number(n.carbs).toFixed(1);
      const f = Number(n.fat).toFixed(1);
      parts.push(
        `<div class="msg-section msg-section--nuts">` +
          `<p class="msg-lead">สรุปโภชนาการ (โดยประมาณ)</p>` +
          `<ul class="msg-nut-list">` +
          `<li><span>พลังงาน</span><strong>${cal} kcal</strong></li>` +
          `<li><span>โปรตีน</span><strong>${p} g</strong></li>` +
          `<li><span>คาร์โบไฮเดรต</span><strong>${c} g</strong></li>` +
          `<li><span>ไขมัน</span><strong>${f} g</strong></li>` +
          `</ul></div>`
      );
    }

    if (data.gemini_explanation) {
      parts.push(
        `<div class="msg-section msg-section--detail"><div class="msg-rich">${formatExplainedText(
          data.gemini_explanation
        )}</div></div>`
      );
    }

    if (data.message && !data.gemini_explanation && !n && !foods.length) {
      parts.push(`<div class="msg-section"><p class="msg-plain">${escapeHtml(data.message)}</p></div>`);
    }

    const ms = data.processing_time_ms != null ? Math.round(Number(data.processing_time_ms)) : null;
    if (ms != null) {
      parts.push(`<p class="msg-foot muted">ประมาณการ · ${ms.toLocaleString()} ms</p>`);
    }

    if (!parts.length) {
      parts.push(`<p class="msg-plain">ไม่มีข้อมูลเพิ่มเติม</p>`);
    }

    return `<div class="msg-chat">${parts.join("")}</div>`;
  }

  function renderNutrition(key) {
    const g = state.goals;
    const t = dailyTotals(key);
    const pct = g.calories > 0 ? Math.min(100, (t.calories / g.calories) * 100) : 0;
    const offset = RING_C * (1 - pct / 100);
    el.calRingFg.style.strokeDashoffset = String(offset);
    el.calPct.textContent = `${Math.round(pct)}%`;
    el.calConsumed.textContent = Math.round(t.calories).toLocaleString();
    el.calGoal.textContent = g.calories.toLocaleString();
    const rem = Math.max(0, g.calories - t.calories);
    el.calRemain.textContent = `Remaining: ${Math.round(rem).toLocaleString()} kcal`;

    el.macroPCurr.textContent = Math.round(t.protein);
    el.macroPGoal.textContent = String(g.protein);
    el.macroCCurr.textContent = Math.round(t.carbs);
    el.macroCGoal.textContent = String(g.carbs);
    el.macroFCurr.textContent = Math.round(t.fat);
    el.macroFGoal.textContent = String(g.fat);

    const w = state.waterByDate[key] || 0;
    const wp = g.waterMl > 0 ? Math.min(100, (w / g.waterMl) * 100) : 0;
    el.waterFill.style.width = `${wp}%`;
    el.waterPct.textContent = String(Math.round(wp));
    el.waterGoalLabel.textContent = String(g.waterMl);
  }

  function weekAverages(endKey) {
    const end = parseKey(endKey);
    let sumC = 0,
      sumP = 0,
      sumCb = 0,
      sumF = 0;
    let daysWithFood = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
      const t = dailyTotals(k);
      if (t.entries > 0) {
        sumC += t.calories;
        sumP += t.protein;
        sumCb += t.carbs;
        sumF += t.fat;
        daysWithFood++;
      }
    }
    if (!daysWithFood) return null;
    return {
      cal: sumC / daysWithFood,
      p: sumP / daysWithFood,
      c: sumCb / daysWithFood,
      f: sumF / daysWithFood,
    };
  }

  function renderWeekly(key) {
    const w = weekAverages(key);
    if (!w) {
      el.wkCal.textContent = "—";
      el.wkP.textContent = "—";
      el.wkC.textContent = "—";
      el.wkF.textContent = "—";
      return;
    }
    el.wkCal.textContent = `${Math.round(w.cal).toLocaleString()} kcal`;
    el.wkP.textContent = `${w.p.toFixed(1)} g`;
    el.wkC.textContent = `${w.c.toFixed(1)} g`;
    el.wkF.textContent = `${w.f.toFixed(1)} g`;
  }

  function renderDate() {
    el.dateLabel.textContent = formatHeaderDate(viewDate);
    const key = dateKey(viewDate);
    renderNutrition(key);
    renderDiary(key);
    renderWeekly(key);
  }

  function scrollChatBottom() {
    el.chat.scrollTop = el.chat.scrollHeight;
  }

  function addChatUser(text, imageDataUrl) {
    if (el.chatWelcome) el.chatWelcome.remove();
    const wrap = document.createElement("div");
    wrap.className = "msg msg--user";
    let html = "";
    if (imageDataUrl) {
      html += `<img class="msg__img" src="${imageDataUrl}" alt="uploaded" />`;
    }
    if (text) {
      html += `<div class="msg__text">${escapeHtml(text)}</div>`;
    }
    wrap.innerHTML = html;
    el.chat.appendChild(wrap);
    scrollChatBottom();
  }

  function addChatAssistant(html, isError) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg--assistant" + (isError ? " msg--err" : "");
    wrap.innerHTML = html;
    el.chat.appendChild(wrap);
    scrollChatBottom();
  }

  function addTyping() {
    const t = document.createElement("div");
    t.className = "typing";
    t.id = "chat-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    el.chat.appendChild(t);
    scrollChatBottom();
    return t;
  }

  function removeTyping() {
    document.getElementById("chat-typing")?.remove();
  }

  async function handleAnalyzeToDiary(file, key) {
    const thumb = await thumbDataUrl(file);
    const data = await analyzeImage(file);
    if (data.success && data.total_nutrition) {
      const entry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        label: entryLabel(data),
        nutrition: {
          calories: data.total_nutrition.calories,
          protein: data.total_nutrition.protein,
          carbs: data.total_nutrition.carbs,
          fat: data.total_nutrition.fat,
        },
        foods: data.detected_foods,
        gemini_explanation: data.gemini_explanation,
        thumbDataUrl: thumb,
        success: true,
      };
      addLogEntry(key, entry);
    }
    return { data, thumb };
  }

  /* Date nav */
  el.datePrev.addEventListener("click", () => {
    viewDate.setDate(viewDate.getDate() - 1);
    renderDate();
  });
  el.dateNext.addEventListener("click", () => {
    const tomorrow = new Date(viewDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tomorrow > today) return;
    viewDate = tomorrow;
    renderDate();
  });

  /* Water */
  document.querySelectorAll(".btn--water").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ml = Number(btn.dataset.ml);
      const key = dateKey(viewDate);
      state.waterByDate[key] = (state.waterByDate[key] || 0) + ml;
      saveState();
      renderNutrition(key);
    });
  });

  /* Modal */
  function openModal() {
    el.modal.hidden = false;
    modalFileObj = null;
    el.modalFile.value = "";
    el.modalPreview.hidden = true;
    el.modalAnalyze.disabled = true;
    el.modalStatus.textContent = "";
    el.modalStatus.className = "modal__status";
  }

  function closeModal() {
    el.modal.hidden = true;
  }

  document.getElementById("btn-add-food").addEventListener("click", openModal);
  document.getElementById("btn-log-first").addEventListener("click", openModal);
  el.modalCancel.addEventListener("click", closeModal);
  el.modalClose.addEventListener("click", closeModal);
  el.modal.querySelector("[data-close-modal]").addEventListener("click", closeModal);

  el.modalDrop.addEventListener("click", () => el.modalFile.click());
  el.modalFile.addEventListener("change", () => {
    const f = el.modalFile.files[0];
    modalFileObj = f || null;
    if (!f) {
      el.modalPreview.hidden = true;
      el.modalAnalyze.disabled = true;
      return;
    }
    const url = URL.createObjectURL(f);
    el.modalPreviewImg.onload = () => URL.revokeObjectURL(url);
    el.modalPreviewImg.src = url;
    el.modalPreview.hidden = false;
    el.modalAnalyze.disabled = false;
    el.modalStatus.textContent = f.name;
  });

  el.modalAnalyze.addEventListener("click", async () => {
    if (!modalFileObj) return;
    el.modalAnalyze.disabled = true;
    el.modalStatus.textContent = "กำลังวิเคราะห์…";
    el.modalStatus.className = "modal__status";
    try {
      const key = dateKey(viewDate);
      const { data } = await handleAnalyzeToDiary(modalFileObj, key);
      if (!data.total_nutrition) {
        el.modalStatus.textContent = data.message || "ไม่พบอาหารในภาพหรือวิเคราะห์ไม่สำเร็จ";
        el.modalStatus.className = "modal__status error";
        el.modalAnalyze.disabled = false;
        return;
      }
      renderDate();
      closeModal();
    } catch (e) {
      el.modalStatus.textContent = e.message || "เกิดข้อผิดพลาด";
      el.modalStatus.className = "modal__status error";
      el.modalAnalyze.disabled = false;
    }
  });

  /* Chat */
  el.btnNewChat.addEventListener("click", () => resetChat());
  el.chatAttachBtn.addEventListener("click", () => el.chatFile.click());
  el.chatFile.addEventListener("change", () => {
    const f = el.chatFile.files[0];
    el.chatFile.value = "";
    setChatPendingFromFile(f || null);
  });
  el.chatPendingRemove.addEventListener("click", () => clearChatPending());

  async function sendChat() {
    const text = el.chatText.value.trim();
    const file = chatPendingFile;

    if (!file && !text) return;

    let imageDataUrl = null;
    if (file) {
      imageDataUrl = await thumbDataUrl(file);
      addChatUser(text, imageDataUrl);
    } else {
      addChatUser(text, null);
    }

    el.chatText.value = "";
    clearChatPending();

    if (!file) {
      addChatAssistant(
        `<div class="msg__text">แนบรูปอาหารแล้วกดส่งได้เลยครับ — ระบบจะวิเคราะห์ผ่าน API จริง (YOLO + Gemini) และส่ง JSON โภชนาการกลับมาให้</div>`,
        false
      );
      return;
    }

    const typing = addTyping();
    try {
      const key = dateKey(viewDate);
      const { data } = await handleAnalyzeToDiary(file, key);
      removeTyping();
      renderDate();
      addChatAssistant(formatAssistantReply(data), false);
    } catch (e) {
      removeTyping();
      addChatAssistant(
        `<div class="msg__text">${escapeHtml(e.message || "เกิดข้อผิดพลาด")}</div>`,
        true
      );
    }
  }

  el.chatSend.addEventListener("click", sendChat);
  el.chatText.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      sendChat();
    }
  });

  /* Diary placeholder fix for no img */
  const style = document.createElement("style");
  style.textContent = `.diary-item__ph{width:56px;height:56px;border-radius:8px;background:rgba(255,255,255,.06);flex-shrink:0}`;
  document.head.appendChild(style);

  el.calRingFg.style.strokeDasharray = String(RING_C);

  renderDate();
})();
