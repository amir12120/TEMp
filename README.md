# TEMp — قالب‌های اختصاصی پنل سنایی (3x-ui)

> **English** — see the [English section](#english) below.

این پروژه برای **پنل سنایی** طراحی شده است؛ یعنی همان پنل 3x-ui که سرویس اشتراک VPN شما روی آن اجرا می‌شود. با یک دستور، صفحه اشتراک کاربر با طراحی‌های مدرن این پروژه جایگزین می‌شود.

## ⚡️ نصب — فقط یک دستور

روی سرور اجرا کنید:

```bash
bash <(curl -sL https://raw.githubusercontent.com/amir12120/TEMp/main/install.sh)
```

یک **منوی CLI** باز می‌شود که لیست همه تم‌های موجود را نشان می‌دهد:

```
==============================================
   TEMp — 3x-ui theme installer
   amir12120/TEMp  ·  target: /etc/3x-ui/templates/my-theme/index.html
==============================================

:: Available themes:

  1) modern
  2) speed

Select theme number [1-2]:
```

عدد تم موردنظر را وارد کنید — همان تم با نام `index.html` در مسیر `/etc/3x-ui/templates/my-theme/` قرار می‌گیرد، پنل ری‌استارت می‌شود و کار تمام است.

## ⚙️ نکته مهم — تنظیم پنل سنایی (بعد از نصب الزامی است)

برای اینکه پنل قالب جدید را بشناسد، در خود پنل سنایی مسیر قالب را معرفی کنید:

1. وارد پنل سنایی شوید.
2. به قسمت **تنظیمات پنل** بروید.
3. تب **سابسکریپشن** را باز کنید.
4. بخش **پروفایل** را پیدا کنید.
5. در قسمت **«پوشه قالب صفحه اشتراک»** عبارت زیر را وارد کنید:

   ```
   /etc/3x-ui/templates/my-theme/
   ```

6. **ذخیره** کنید.

از این پس صفحه اشتراک کاربران از قالب نصب‌شده در این مسیر خوانده می‌شود. (نصاب هم بعد از نصب همین راهنما را نمایش می‌دهد.)

## نصاب چه کاری انجام می‌دهد؟

1. لیست تم‌ها را از `pages.txt` همین ریپو می‌خواند و منو را نمایش می‌دهد.
2. تم انتخابی را از `pages/<name>/index.html` دانلود می‌کند.
3. مسیر `/etc/3x-ui/templates/my-theme/` را در صورت عدم وجود می‌سازد.
4. اگر از قبل `index.html` وجود داشته باشد، از آن **بکاپ زمان‌دار** می‌گیرد (فایل `.bak`) — پس برگشت به تم قبلی همیشه ممکن است.
5. فایل جدید را به‌صورت اتمی جایگزین `index.html` می‌کند.
6. پنل 3x-ui را ری‌استارت می‌کند.

## صفحه‌های موجود

| صفحه     | توضیح |
|----------|-------|
| `modern` | صفحه اشتراک مدرن — دو زبانه (فارسی/انگلیسی)، حالت شب و روز، QR کد برای تک‌تک کانفیگ‌ها، اندازه‌گیری تأخیر ترنسپورت‌های HTTP از مرورگر، نشانگر آنلاین/آفلاین زنده، ساعت تهران با رویدادهای تقویم ایرانی، بخش دانلود اپلیکیشن (۸ برنامه با لینک آخرین نسخه — برای v2rayNG حتی نسخه‌های pre-release) |
| `speed`  | داشبورد اسپرت «کیلومتر و دور موتور» — دو گیج عقربه‌ای (زمان باقی‌مانده روی **مقیاس ثابت ۳۰ روزه** — عقربه تا وقتی بیش از ۳۰ روز باقی است روی «پر» می‌ماند و بعد کم‌کم به صفر و رنگ قرمز می‌رسد، به‌همراه جزئیات مصرف با **حجم باقی‌ماندهٔ قرمز چشمک‌زن با برچسب «باقی‌مانده» در وسط نیمهٔ بالایی صفحهٔ گیج**) که **همیشه کنار هم** می‌مانند و روی موبایل هم با یک ضربه **بزرگ و خوانا** می‌شوند و با ضربه‌ی بعدی سر جایشان برمی‌گردند (در حالت بزرگ‌شدهٔ گیج زمان، ساعت تهران کنار می‌رود و فقط **تاریخ انقضا زیر صفحهٔ گیج** می‌ماند)، ساعت گرد به وقت تهران با تاریخ و مناسبت زیر آن، کارت وضعیت سرویس/آنلاین/کاربر در گوشه، کلیدهای زبان و شب/روز به شکل **کلیدهای داشبورد ماشین** در بالاترین نقطهٔ صفحه، لوگوی سکهٔ چرخان (همان تم مدرن)، لینک ساب و کانفیگ‌ها پایین گیج‌ها (روی موبایل هر کانفیگ **در یک خط** مثل تم مدرن، با کلیدهای QR و کپی کنار هم)، بخش **نصب و راه‌اندازی / دانلود برنامه‌ها** که سیستم‌عامل کاربر را خودکار تشخیص می‌دهد و برنامه‌های همان دستگاه را نشان می‌دهد و برای انتخاب دستی هم یک **منوی کشویی** دارد (۸ برنامه، همیشه آخرین نسخه — برای v2rayNG حتی نسخه‌های pre-release)، همهٔ منوها/گیج‌ها/کلیدها/باکس‌ها **برجسته و سه‌بعدی**، و **حالت پیش‌فرض روز + زبان فارسی** |

## افزودن تم جدید در آینده

1. پوشه جدید بسازید: `pages/<name>/index.html` (نام فقط حروف، عدد، `-` و `_`).
2. نام آن را یک خط به `pages.txt` اضافه کنید.
3. کامیت و پوش کنید — منوی نصاب به‌صورت خودکار آن را نشان می‌دهد و نیازی به تغییر اسکریپت نیست.

## ساختار ریپو

```
TEMp/
├── install.sh          # نصاب با منوی تعاملی
├── pages.txt           # لیست تم‌های موجود (هر نام یک خط: modern، speed)
└── pages/
    ├── modern/
    │   └── index.html  # تم مدرن
    └── speed/
        └── index.html  # تم اسپرت کیلومتر
```

---

<a id="english"></a>
## English

Custom subscription-page themes for the **Senai panel** (MHSanaei's 3x-ui fork). One single
command opens an interactive CLI menu of every theme in this repo; picking a number installs
it as the panel theme.

### Install

```bash
bash <(curl -sL https://raw.githubusercontent.com/amir12120/TEMp/main/install.sh)
```

The installer:

1. Lists all themes from `pages.txt` in a numbered menu.
2. Downloads the chosen theme from `pages/<name>/index.html`.
3. Creates `/etc/3x-ui/templates/my-theme/` if missing.
4. **Backs up** any existing `index.html` (timestamped `.bak`) — the previous theme is never lost.
5. Atomically replaces `index.html` and restarts the 3x-ui panel.

### Required panel setting (after install)

In the panel: **Panel Settings → Subscription → Profile → "Sub Theme Directory"** — enter:

```
/etc/3x-ui/templates/my-theme/
```

and **Save**. The subscription page now renders from this folder.

### Available themes

| Theme    | Description |
|----------|-------------|
| `modern` | Modern bilingual (fa/en) subscription & usage panel — dark/light modes, per-config QR codes, browser latency measurement for HTTP transports, live online/offline presence, Tehran clock with Iranian-calendar events, app download section (8 apps, always the newest release; v2rayNG includes pre-releases) |
| `speed`  | Sporty car-dashboard (speedometer/tachometer) theme — two needle gauges (time remaining on a **fixed 30-day scale** — the needle waits at “full” while more than 30 days are left, then counts down to zero and turns red, plus usage details with the **remaining quota blinking in red under a “Remaining” label in the middle of the upper half of the dial**) that always sit **side by side** and blow up to a readable size on tap (tap again to put them back — in the enlarged time gauge the Tehran clock steps aside and only the **expiry date under the dial** remains), round Tehran clock with date and occasion beneath it, service status/online/user card in the corner, language and day/night controls styled as **car-dashboard rocker switches** at the very top, the modern theme's spinning coin logo, sub link and configs below (on phones each config stays on **one line** like the modern theme, with the QR and copy buttons inline), and an **install & setup / app-download section** that auto-detects the visitor's OS, lists that device's apps and still offers a **dropdown** for manual picks (8 apps, always the newest release; v2rayNG includes pre-releases), every menu/gauge/button/box **embossed and 3D**, and **day mode + Persian as the defaults** |

### Adding a new theme

Create `pages/<name>/index.html`, add the name to `pages.txt`, push. The menu picks it up
automatically — the script itself never needs changing.
