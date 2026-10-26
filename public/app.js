import { LETTERS, catalog, normalizePhone, resolvePlate, toFa } from "./plates.js";

const plate = document.querySelector("#plate");
const left = document.querySelector("#left");
const mid = document.querySelector("#mid");
const region = document.querySelector("#region");
const letter = document.querySelector("#letter");
const letterFace = document.querySelector("#letterFace");
const letterTag = document.querySelector("#letterTag");
const formError = document.querySelector("#formError");
const result = document.querySelector("#result");
const cityName = document.querySelector("#cityName");
const resultKicker = document.querySelector("#resultKicker");
const resultMeta = document.querySelector("#resultMeta");
const nearby = document.querySelector("#nearby");
const resultNote = document.querySelector("#resultNote");
const smsText = document.querySelector("#smsText");
const copySms = document.querySelector("#copySms");
const tabCar = document.querySelector("#tabCar");
const tabMoto = document.querySelector("#tabMoto");
const motoFields = document.querySelector("#motoFields");
const motoCode = document.querySelector("#motoCode");
const motoSerial = document.querySelector("#motoSerial");
const phone = document.querySelector("#phone");
const phoneError = document.querySelector("#phoneError");
const saveWatch = document.querySelector("#saveWatch");
const watchForm = document.querySelector("#watchForm");
const watchList = document.querySelector("#watchList");
const catalogRoot = document.querySelector("#catalog");
const filter = document.querySelector("#filter");

const STORE = "shahrpelak.watches.v1";
let vehicle = "car";
let current = null;
const provinces = catalog();

const groups = ["شخصی", "خدمات", "نهادها"];
for (const group of groups) {
  const holder = document.createElement("optgroup");
  holder.label = group;
  for (const item of LETTERS.filter((entry) => entry.group === group)) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.usage === "شخصی" ? item.id : `${item.id} ${item.usage}`;
    holder.append(option);
  }
  letter.append(holder);
}

const samples = [
  ["تهران", { left: "۱۲", letter: "ب", mid: "۳۴۵", region: "۱۱" }],
  ["شهریار", { left: "۲۲", letter: "د", mid: "۱۱۷", region: "۷۸" }],
  ["کرج", { left: "۶۸", letter: "ب", mid: "۲۲۰", region: "۶۸" }],
  ["مشهد", { left: "۱۱", letter: "ی", mid: "۴۵۶", region: "۱۲" }],
  ["مشترک البرز", { left: "۲۱", letter: "ب", mid: "۱۰۰", region: "۳۸" }],
];

const sampleRoot = document.querySelector("#samples");
for (const [label, value] of samples) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => {
    setVehicle("car");
    left.value = value.left;
    mid.value = value.mid;
    region.value = value.region;
    letter.value = value.letter;
    syncLetter();
    paint();
    read();
    if (!result.hidden) result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  sampleRoot.append(button);
}

function digitsOnly(input, size) {
  const persian = toFa(input.value).replace(/[^\d۰-۹]/g, "").slice(0, size);
  if (input.value !== persian) input.value = persian;
}

function syncLetter() {
  const selected = LETTERS.find((item) => item.id === letter.value) || LETTERS[0];
  letterFace.textContent = selected.id;
  letterTag.textContent = selected.usage === "شخصی" ? "" : selected.usage === "تاکسی" ? "TAXI" : selected.usage;
  const tone = {
    شخصی: "white",
    "معلولین و جانبازان": "white",
    گذرموقت: "white",
    تاکسی: "yellow",
    عمومی: "yellow",
    کشاورزی: "yellow",
    دولتی: "red",
    پلیس: "green",
    سپاه: "green",
    ارتش: "khaki",
    "وزارت دفاع": "blue",
    "ستاد کل نیروهای مسلح": "blue",
    دیپلمات: "diplomatic",
    "سرویس سفارت": "diplomatic",
  }[selected.usage] || "white";
  plate.className = `plate plate--${tone}`;
}

function setVehicle(next) {
  vehicle = next;
  const car = next === "car";
  tabCar.setAttribute("aria-selected", String(car));
  tabMoto.setAttribute("aria-selected", String(!car));
  plate.hidden = !car;
  motoFields.hidden = car;
  sampleRoot.hidden = !car;
  read();
}

function read() {
  formError.hidden = true;
  const resolved = vehicle === "car"
    ? resolvePlate({ left: left.value, letter: letter.value, mid: mid.value, region: region.value })
    : resolvePlate({ code: motoCode.value, serial: motoSerial.value, vehicle: "motorcycle" });
  if (!resolved.ok) {
    current = null;
    result.hidden = true;
    saveWatch.disabled = true;
    if (filled()) {
      formError.hidden = false;
      formError.textContent = resolved.error;
    }
    return;
  }
  current = resolved;
  paintResult(resolved);
}

function filled() {
  if (vehicle === "motorcycle") return motoCode.value.length + motoSerial.value.length > 0 && (motoCode.value.length === 3 || motoSerial.value.length === 5);
  return left.value && mid.value && region.value && (left.value.length === 2 || mid.value.length === 3 || region.value.length === 2);
}

function paintResult(resolved) {
  result.hidden = false;
  const title = resolved.cities.length
    ? resolved.cities.join("، ")
    : resolved.provinces.join("، ") || "کد نامشخص";
  cityName.textContent = title;
  resultKicker.textContent = kicker(resolved);
  const bits = [resolved.display, resolved.usage];
  if (resolved.provinces.length && resolved.cities.length) bits.push(`استان ${resolved.provinces.join("، ")}`);
  resultMeta.textContent = bits.join("  ·  ");
  nearby.hidden = resolved.nearby.length === 0;
  nearby.textContent = resolved.nearby.length ? `حوزه نزدیک: ${resolved.nearby.join("، ")}` : "";
  resultNote.hidden = !resolved.note;
  resultNote.textContent = resolved.note;
  smsText.textContent = resolved.sms;
  saveWatch.disabled = !resolved.canNotify;
}

function kicker(resolved) {
  if (resolved.kind === "city") return resolved.vehicle === "motorcycle" ? "استان پلاک موتور" : "شهر پلاک";
  if (resolved.kind === "shared") return "کد مشترک";
  if (resolved.kind === "province") return "حد استان";
  if (resolved.kind === "reserved") return "کد ذخیره";
  return "خارج از جدول";
}

function paint() {
  syncLetter();
}

for (const input of [left, mid, region]) {
  input.addEventListener("input", () => {
    digitsOnly(input, input.maxLength);
    read();
  });
}
letter.addEventListener("change", () => {
  syncLetter();
  read();
});
for (const input of [motoCode, motoSerial]) {
  input.addEventListener("input", () => {
    digitsOnly(input, input.maxLength);
    read();
  });
}
tabCar.addEventListener("click", () => setVehicle("car"));
tabMoto.addEventListener("click", () => setVehicle("motorcycle"));
document.querySelector("#scrollInbox").addEventListener("click", () => {
  document.querySelector("#inbox").scrollIntoView({ behavior: "smooth" });
  phone.focus();
});

copySms.addEventListener("click", async () => {
  if (!current) return;
  await copyText(current.sms);
  copySms.textContent = "کپی شد";
  setTimeout(() => {
    copySms.textContent = "کپی متن پیامک";
  }, 1400);
});

function loadWatches() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "[]");
  } catch {
    return [];
  }
}

function saveWatches(items) {
  localStorage.setItem(STORE, JSON.stringify(items));
}

function renderWatches() {
  const items = loadWatches();
  watchList.replaceChildren();
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "هنوز شماره‌ای این‌جا نیست. اول پلاک را بخوان، بعد موبایل را اضافه کن.";
    watchList.append(empty);
    return;
  }
  for (const item of items) {
    const card = document.createElement("article");
    card.className = "watch";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${toFa(item.phone)}  ·  ${item.display}`;
    const text = document.createElement("p");
    text.textContent = item.sms;
    body.append(title, text);
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "tiny";
    copy.textContent = "کپی";
    copy.addEventListener("click", () => copyText(item.sms));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "tiny";
    remove.textContent = "حذف";
    remove.addEventListener("click", () => {
      saveWatches(loadWatches().filter((row) => row.id !== item.id));
      renderWatches();
    });
    actions.append(copy, remove);
    card.append(body, actions);
    watchList.append(card);
  }
}

watchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  phoneError.hidden = true;
  if (!current || !current.canNotify) {
    phoneError.hidden = false;
    phoneError.textContent = "اول یک پلاک معتبر بخوان.";
    return;
  }
  const normalized = normalizePhone(phone.value);
  if (!normalized) {
    phoneError.hidden = false;
    phoneError.textContent = "شماره را با ۰۹ و یازده رقم بنویس.";
    return;
  }
  const items = loadWatches().filter((item) => !(item.phone === normalized && item.display === current.display));
  items.unshift({
    id: `${Date.now()}`,
    phone: normalized,
    display: current.display,
    sms: current.sms,
    savedAt: new Date().toISOString(),
  });
  saveWatches(items);
  phone.value = "";
  renderWatches();
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function renderCatalog(query) {
  const needle = query.trim();
  catalogRoot.replaceChildren();
  let shown = 0;
  for (const province of provinces) {
    const cities = province.cities.filter((city) => {
      if (!needle) return true;
      const blob = `${province.province} ${city.city} ${city.codes.join(" ")}`;
      return blob.includes(needle) || blob.includes(toFa(needle)) || toFa(blob).includes(needle);
    });
    if (cities.length === 0) continue;
    shown += 1;
    const details = document.createElement("details");
    details.className = "province";
    details.open = Boolean(needle);
    const summary = document.createElement("summary");
    summary.textContent = province.province;
    details.append(summary);
    for (const city of cities) {
      const row = document.createElement("div");
      row.className = "city-row";
      const name = document.createElement("span");
      name.textContent = city.city;
      const codes = document.createElement("span");
      codes.className = "codes";
      codes.textContent = city.codes.map((code) => toFa(code)).join("  ");
      row.append(name, codes);
      details.append(row);
    }
    catalogRoot.append(details);
  }
  if (shown === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "چیزی با این عبارت پیدا نشد.";
    catalogRoot.append(empty);
  }
}

filter.addEventListener("input", () => renderCatalog(filter.value));

syncLetter();
renderWatches();
renderCatalog("");
read();
