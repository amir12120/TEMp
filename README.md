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

Select theme number [1-1]:
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
| `modern` | صفحه اشتراک مدرن — دو زبانه (فارسی/انگلیسی)، حالت شب و روز، QR کد برای تک‌تک کانفیگ‌ها، اندازه‌گیری تأخیر ترنسپورت‌های HTTP از مرورگر، نشانگر آنلاین/آفلاین زنده، ساعت تهران با رویدادهای تقویم ایرانی، بخش دانلود اپلیکیشن (۸ برنامه با لینک آخرین نسخه پایدار) |

## افزودن تم جدید در آینده

1. پوشه جدید بسازید: `pages/<name>/index.html` (نام فقط حروف، عدد، `-` و `_`).
2. نام آن را یک خط به `pages.txt` اضافه کنید.
3. کامیت و پوش کنید — منوی نصاب به‌صورت خودکار آن را نشان می‌دهد و نیازی به تغییر اسکریپت نیست.

## ساختار ریپو

```
TEMp/
├── install.sh          # نصاب با منوی تعاملی
├── pages.txt           # لیست تم‌های موجود (هر نام یک خط)
└── pages/
    └── modern/
        └── index.html  # تم‌ای که به‌عنوان my-theme/index.html نصب می‌شود
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
| `modern` | Modern bilingual (fa/en) subscription & usage panel — dark/light modes, per-config QR codes, browser latency measurement for HTTP transports, live online/offline presence, Tehran clock with Iranian-calendar events, app download section (8 apps, always latest stable) |

### Adding a new theme

Create `pages/<name>/index.html`, add the name to `pages.txt`, push. The menu picks it up
automatically — the script itself never needs changing.
