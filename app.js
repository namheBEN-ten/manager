const $ = id => document.getElementById(id);

let tasks = JSON.parse(localStorage.getItem("mk_tasks") || "[]");

let selectedDate = new Date().toISOString().slice(0, 10);

let monthCursor = new Date();

/* =========================
ابزارها
========================= */

function localDate(d = new Date()) {
    const z = n => String(n).padStart(2, "0");
    return (
        d.getFullYear() +
        "-" +
        z(d.getMonth() + 1) +
        "-" +
        z(d.getDate())
    );
}

function save() {
    localStorage.setItem("mk_tasks", JSON.stringify(tasks));
}

function esc(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function makeId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    );
}

/* =========================
باز کردن پنجره کار
========================= */

function openTask() {
    const modal = $("taskModal");
    if (!modal) {
        console.error("taskModal پیدا نشد");
        return;
    }
    modal.classList.add("show");

    const date = $("date");
    if (date) {
        date.value = selectedDate;
    }
}

/* =========================
بستن پنجره
========================= */

function closeTask() {
    const modal = $("taskModal");
    if (modal) {
        modal.classList.remove("show");
    }
}

/* =========================
اضافه کردن کار
========================= */

function addTask() {
    const titleInput = $("title");
    if (!titleInput) {
        console.error("title پیدا نشد");
        return;
    }

    const title = titleInput.value.trim();
    if (!title) {
        alert("عنوان کار را وارد کن 🌸");
        return;
    }

    const task = {
        id: makeId(),
        title: title,
        date: $("date") ? $("date").value : "",
        time: $("time") ? $("time").value : "",
        priority: $("priority") ? $("priority").value : "",
        note: $("note") ? $("note").value.trim() : "",
        done: false,
        doneAt: null
    };

    tasks.unshift(task);
    save();
    closeTask();
    renderTasks();
    scheduleAlarm(task);

    titleInput.value = "";
    if ($("time")) $("time").value = "";
    if ($("note")) $("note").value = "";
}

/* =========================
نمایش کارها
========================= */

function renderTasks() {
    const list = $("taskList");
    const cal = $("calendarTasks");
    const empty = $("empty");

    if (!list) return;

    list.innerHTML = "";

    if (empty) {
        empty.style.display = tasks.length === 0 ? "" : "none";
    }

    tasks.forEach((task, index) => {
        const element = document.createElement("div");
        element.className = "task" + (task.done ? " done" : "");

        element.innerHTML = `
            <input class="check" type="checkbox" ${task.done ? "checked" : ""} onchange="toggleTask(${index})">
            <div class="task-body">
                <div class="task-title">${esc(task.title)}</div>
                <div class="meta">
                    ${esc(task.date || "بدون تاریخ")}
                    ${task.time ? " · " + esc(task.time) : ""}
                    ${task.priority ? " · " + esc(task.priority) : ""}
                    ${task.note ? " · " + esc(task.note) : ""}
                </div>
            </div>
            <div class="icon">${["📚", "🎧", "🧹", "🛒", "🏃"][index % 5]}</div>
            <button class="delete" onclick="removeTask(${index})">🗑️</button>
        `;

        list.appendChild(element);
    });

    /* تقویم */
    if (cal) {
        cal.innerHTML = "";

        const dayTasks = tasks.filter(task => task.date === selectedDate);

        if (dayTasks.length === 0) {
            cal.innerHTML = '<p class="empty">کاری برای این روز ثبت نشده</p>';
        } else {
            dayTasks.forEach(task => {
                const element = document.createElement("div");
                element.className = "task";
                element.innerHTML = `
                    <div class="task-body">
                        <b>${esc(task.title)}</b>
                        <div class="meta">${esc(task.time || "")}</div>
                    </div>
                `;
                cal.appendChild(element);
            });
        }
    }

    renderStats();
}

/* =========================
انجام / لغو انجام کار
========================= */

function toggleTask(index) {
    if (!tasks[index]) return;

    tasks[index].done = !tasks[index].done;
    tasks[index].doneAt = tasks[index].done ? localDate() : null;

    save();
    renderTasks();
}

/* =========================
حذف کار
========================= */

function removeTask(index) {
    if (!tasks[index]) return;

    tasks.splice(index, 1);
    save();
    renderTasks();
}

/* =========================
آمار
========================= */

function renderStats() {
    const total = tasks.length;
    const done = tasks.filter(task => task.done).length;
    const percent = total === 0 ? 0 : Math.round((done * 100) / total);

    if ($("percent")) $("percent").textContent = percent + "%";
    if ($("ring")) $("ring").style.setProperty("--p", percent + "%");
    if ($("statText")) $("statText").textContent = `${done} کار از ${total} کار انجام شده`;
    if ($("total")) $("total").textContent = total;
    if ($("done")) $("done").textContent = done;
    if ($("remaining")) $("remaining").textContent = total - done;

    renderBars();
}

/* =========================
نمودار ۷ روز اخیر
========================= */

function renderBars() {
    const bars = $("bars");
    if (!bars) return;

    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    const counts = days.map(d => {
        const key = localDate(d);
        return tasks.filter(task => task.done && task.doneAt === key).length;
    });

    const max = Math.max(1, ...counts);
    const weekday = d => new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(d);

    bars.innerHTML = "";
    days.forEach((d, i) => {
        const count = counts[i];
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = Math.max(3, Math.round((count / max) * 100)) + "px";
        bar.title = count + " کار انجام شده";
        bar.innerHTML = `<small>${esc(weekday(d))}</small>`;
        bars.appendChild(bar);
    });
}

/* =========================
اعلان
========================= */

async function requestNotifications() {
    if (!("Notification" in window)) {
        alert("مرورگر شما از اعلان پشتیبانی نمی‌کند.");
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            alert("اعلان‌ها فعال شدند 🔔");
            restoreAlarms();
        } else {
            alert("اجازه اعلان داده نشد.");
        }
    } catch (error) {
        console.error(error);
        alert("فعال‌سازی اعلان انجام نشد.");
    }
}

/* =========================
جلوگیری از اعلان تکراری
========================= */

function alarmKey(id, time) {
    return "mk_alarm_" + id + "_" + time.getTime();
}

function alarmAlreadyFired(id, time) {
    return localStorage.getItem(alarmKey(id, time)) === "1";
}

function markAlarmFired(id, time) {
    localStorage.setItem(alarmKey(id, time), "1");
}

/* =========================
نمایش اعلان
========================= */

function showBrowserNotification(task, id, time) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (alarmAlreadyFired(id, time)) return;

    try {
        new Notification("مدیریت کار 🔔", {
            body: task.title + "\nالان زمان انجام این کاره!",
            tag: "task-alarm-" + id,
            requireInteraction: true
        });

        markAlarmFired(id, time);
    } catch (error) {
        console.error("Notification error:", error);
    }
}

/* =========================
زمان‌بندی آلارم
========================= */

function scheduleAlarm(task) {
    if (!task || !task.id || !task.date || !task.time || task.done) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const alarmTime = new Date(task.date + "T" + task.time + ":00");
    if (Number.isNaN(alarmTime.getTime())) return;

    const delay = alarmTime.getTime() - Date.now();
    if (delay <= 0) return;

    /* تایمر اصلی */
    setTimeout(() => {
        showBrowserNotification(task, task.id, alarmTime);
    }, delay);

    /* بررسی پشتیبان */
    const checker = setInterval(() => {
        if (Date.now() >= alarmTime.getTime()) {
            showBrowserNotification(task, task.id, alarmTime);
            clearInterval(checker);
        }
    }, 1000);
}

/* =========================
برگرداندن آلارم‌ها
========================= */

function restoreAlarms() {
    tasks.forEach(task => {
        if (task && task.date && task.time && !task.done) {
            scheduleAlarm(task);
        }
    });
}

/* =========================
تقویم
========================= */

function getPersianParts(date) {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
        year: "numeric",
        month: "numeric",
        day: "numeric"
    }).formatToParts(date);

    const result = {};
    parts.forEach(part => {
        result[part.type] = part.value;
    });

    return {
        year: Number(result.year),
        month: Number(result.month),
        day: Number(result.day)
    };
}

function renderCalendar() {
    const grid = $("calendarGrid");
    if (!grid) return;

    const today = new Date();
    const current = getPersianParts(monthCursor);

    const first = new Date(monthCursor);
    while (
        getPersianParts(first).month === current.month &&
        getPersianParts(first).day > 1
    ) {
        first.setDate(first.getDate() - 1);
    }

    const monthTitle = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "long"
    }).format(monthCursor);

    if ($("monthTitle")) $("monthTitle").textContent = monthTitle;

    const start = new Date(first);
    const saturdayIndex = (start.getDay() + 1) % 7;
    start.setDate(start.getDate() - saturdayIndex);

    grid.innerHTML = "";

    for (let i = 0; i < 42; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        const persian = getPersianParts(date);
        const cell = document.createElement("button");

        cell.className =
            "day" +
            (persian.month !== current.month ? " other" : "") +
            (localDate(date) === localDate(today) ? " today" : "") +
            (localDate(date) === selectedDate ? " selected" : "");

        cell.textContent = new Intl.NumberFormat("fa-IR").format(persian.day);

        cell.onclick = () => {
            selectedDate = localDate(date);
            renderCalendar();
            renderTasks();
        };

        grid.appendChild(cell);
    }
}

function moveMonth(direction) {
    monthCursor.setMonth(monthCursor.getMonth() + direction);
    renderCalendar();
}

/* =========================
تنظیمات
========================= */

function saveName() {
    const input = $("userName");
    if (!input) return;

    localStorage.setItem("mk_name", input.value);

    if ($("helloName")) {
        $("helloName").textContent = "سلام " + (input.value || "!") + " 💕";
    }
}

function saveAppName() {
    const input = $("appName");
    if (!input) return;

    const name = input.value || "مدیریت کار";
    localStorage.setItem("mk_app", name);
    document.title = name;
}

function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
        "mk_dark",
        document.documentElement.classList.contains("dark")
    );
}

function clearTasks() {
    if (!confirm("همه کارها حذف شوند؟")) return;

    tasks = [];
    save();
    renderTasks();
}

/* =========================
راه‌اندازی برنامه
========================= */

function initApp() {
    /* منوی پایین */
    document.querySelectorAll(".nav").forEach(button => {
        button.onclick = () => {
            document.querySelectorAll(".nav").forEach(item => item.classList.remove("active"));
            button.classList.add("active");

            document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
            const page = $(button.dataset.page);
            if (page) page.classList.add("active");

            if (button.dataset.page === "calendar") {
                renderCalendar();
            }
        };
    });

    if ($("persianToday")) {
        $("persianToday").textContent = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
        }).format(new Date());
    }

    if ($("userName")) {
        $("userName").value = localStorage.getItem("mk_name") || "نازنین";
        saveName();
    }

    if ($("appName")) {
        $("appName").value = localStorage.getItem("mk_app") || "مدیریت کار";
        saveAppName();
    }

    if (localStorage.getItem("mk_dark") === "true") {
        document.documentElement.classList.add("dark");
    }

    renderCalendar();
    renderTasks();
    restoreAlarms();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

/* =========================
برگشت به تب
========================= */

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        restoreAlarms();
    }
});

window.addEventListener("pageshow", () => {
    restoreAlarms();
});