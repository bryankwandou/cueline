"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { load, save } from "./storage";

export type Lang = "en" | "id";

/**
 * A flat dictionary rather than a library.
 *
 * Two languages and a few dozen strings do not justify pulling in an i18n
 * framework, its route middleware, and its build step. What matters is that
 * every visible string has exactly one place it lives, so a translator can
 * see the whole surface in one file.
 */
const dict = {
  "nav.how": { en: "How it runs", id: "Cara kerjanya" },
  "nav.key": { en: "Your key", id: "Kunci Anda" },
  "nav.cost": { en: "Cost", id: "Biaya" },
  "nav.console": { en: "Open console", id: "Buka konsol" },

  "hero.badge": { en: "Runs on Claude Haiku 4.5", id: "Berjalan di Claude Haiku 4.5" },
  "hero.h1a": { en: "Your prompts fire", id: "Prompt Anda terkirim" },
  "hero.h1b": { en: "while you're still", id: "ketika Anda masih" },
  "hero.h1c": { en: "stuck in traffic.", id: "terjebak macet." },
  "hero.sub": {
    en: "You send roughly the same three prompts every morning. Write them once, put a clock on them, and read the answers when you sit down. Nobody has to type at a red light.",
    id: "Tiap pagi Anda mengirim kira-kira tiga prompt yang sama. Tulis sekali, pasangi jam, lalu baca jawabannya begitu duduk. Tidak ada lagi yang mengetik di lampu merah.",
  },
  "hero.cta": { en: "Queue your first cue", id: "Antrekan cue pertama" },
  "hero.cta2": { en: "Where does my key go?", id: "Kunci saya disimpan di mana?" },
  "hero.note": {
    en: "No account. Nothing to install. Bring your own Anthropic key.",
    id: "Tanpa akun. Tanpa pemasangan. Pakai kunci Anthropic Anda sendiri.",
  },

  "card.next": { en: "Next fire", id: "Menyala berikutnya" },
  "card.armed": { en: "Armed", id: "Siap" },
  "card.counting": { en: "counting to your next 07:00", id: "menghitung ke pukul 07:00 Anda berikutnya" },
  "card.cue1": {
    en: "Summarise everything in #standup since 6pm",
    id: "Ringkas semua di #standup sejak pukul 18.00",
  },
  "card.cue2": {
    en: "Three risks in the Q3 forecast, one line each",
    id: "Tiga risiko di proyeksi Q3, satu baris masing-masing",
  },
  "card.cue3": {
    en: "What did I say I'd finish today?",
    id: "Apa yang saya janjikan selesai hari ini?",
  },
  "card.foot": {
    en: "Three cues, sent in order, roughly a tenth of a cent.",
    id: "Tiga cue, terkirim berurutan, sekitar sepersepuluh sen.",
  },

  "problem.h": {
    en: "The work is scheduled.\nThe typing isn't.",
    id: "Pekerjaannya terjadwal.\nMengetiknya tidak.",
  },
  "problem.p1": {
    en: "The morning brief lands at 07:00 whether or not you are at a desk. So people type it out on a phone, in a car, on a train — or they skip it and lose the thread for a day.",
    id: "Laporan pagi tetap jatuh pukul 07.00, entah Anda sedang di meja atau tidak. Akhirnya orang mengetiknya di ponsel, di mobil, di kereta — atau melewatkannya dan kehilangan alurnya seharian.",
  },
  "problem.p2": {
    en: "The prompt was never the hard part. The hard part is that you have to be somewhere specific, holding something, at a particular minute. Cueline moves that minute off your shoulders and onto a clock.",
    id: "Prompt-nya tidak pernah jadi bagian yang sulit. Yang sulit adalah Anda harus berada di tempat tertentu, memegang sesuatu, pada menit tertentu. Cueline memindahkan menit itu dari pundak Anda ke sebuah jam.",
  },

  "steps.h": { en: "Three things, then nothing", id: "Tiga langkah, lalu selesai" },
  "steps.sub": {
    en: "Setup takes about as long as sending one prompt manually. After that you stop thinking about it.",
    id: "Penyiapannya kira-kira selama mengirim satu prompt secara manual. Setelah itu Anda berhenti memikirkannya.",
  },
  "steps.1t": { en: "Paste your key", id: "Tempel kunci Anda" },
  "steps.1d": {
    en: "An Anthropic API key from the Console. It is stored in this browser and nowhere else — no account to make, no password to forget.",
    id: "Kunci API Anthropic dari Console. Tersimpan di peramban ini dan tidak di tempat lain — tidak ada akun yang dibuat, tidak ada sandi yang terlupa.",
  },
  "steps.2t": { en: "Write your cues", id: "Tulis cue Anda" },
  "steps.2d": {
    en: "The prompts you'd otherwise type by hand. Add as many as you want; they run top to bottom, one after another.",
    id: "Prompt yang biasanya Anda ketik sendiri. Tambahkan sebanyak yang Anda mau; semuanya berjalan dari atas ke bawah, satu per satu.",
  },
  "steps.3t": { en: "Set the clock and walk away", id: "Setel jamnya lalu tinggalkan" },
  "steps.3d": {
    en: "Hours, minutes, seconds. When it hits zero the queue runs and the replies are waiting when you come back to the tab.",
    id: "Jam, menit, detik. Begitu mencapai nol antreannya berjalan, dan jawabannya sudah menunggu saat Anda kembali ke tab.",
  },

  "key.h": { en: "Your key never sleeps here", id: "Kunci Anda tidak menginap di sini" },
  "key.p1": {
    en: "There is no user table, no key vault, no session store. The key sits in your browser's local storage. When a cue fires, it rides along on that one request, gets used, and is dropped when the request ends.",
    id: "Tidak ada tabel pengguna, tidak ada brankas kunci, tidak ada penyimpanan sesi. Kuncinya ada di penyimpanan lokal peramban Anda. Saat sebuah cue menyala, kunci itu ikut pada satu permintaan, dipakai, lalu dibuang begitu permintaannya selesai.",
  },
  "key.p2": {
    en: "That is a real constraint, not a slogan: it means we could not hand your key to anyone even if we were asked to, because we do not have it after the call returns.",
    id: "Itu batasan nyata, bukan slogan: artinya kami tidak bisa menyerahkan kunci Anda kepada siapa pun sekalipun diminta, karena kami sudah tidak memilikinya setelah panggilan itu selesai.",
  },
  "key.r1": { en: "holds the key", id: "memegang kuncinya" },
  "key.r2": { en: "borrows it for one call", id: "meminjamnya untuk satu panggilan" },
  "key.r3": { en: "answers", id: "menjawab" },
  "key.r4": { en: "does not exist", id: "tidak ada" },
  "key.note": {
    en: "Because storage is local, cues fire while the tab is open — backgrounded is fine, closed is not. That is the honest trade for not holding anyone's credentials.",
    id: "Karena penyimpanannya lokal, cue menyala selama tab terbuka — di latar belakang tidak masalah, tertutup tidak bisa. Itu imbalan jujur dari tidak memegang kredensial siapa pun.",
  },

  "cost.h": { en: "It costs about a nickel a month", id: "Biayanya sekitar seribu rupiah sebulan" },
  "cost.sub": {
    en: "Haiku 4.5 is priced at $1 per million input tokens and $5 per million output. A daily brief does not move that needle. You pay Anthropic directly; Cueline takes nothing.",
    id: "Haiku 4.5 dihargai $1 per satu juta token masukan dan $5 per satu juta keluaran. Laporan harian tidak menggeser angka itu. Anda membayar Anthropic langsung; Cueline tidak mengambil apa pun.",
  },
  "cost.th1": { en: "Usage", id: "Pemakaian" },
  "cost.th2": { en: "Roughly", id: "Kira-kira" },
  "cost.th3": { en: "Cost", id: "Biaya" },
  "cost.r1": { en: "One short cue", id: "Satu cue pendek" },
  "cost.r2": { en: "A three-cue morning brief", id: "Laporan pagi tiga cue" },
  "cost.r3": { en: "Every weekday for a month", id: "Tiap hari kerja selama sebulan" },

  "limits.h": { en: "What it deliberately won't do", id: "Yang sengaja tidak dilakukan" },
  "limits.sub": {
    en: "Worth reading before you decide it fits.",
    id: "Layak dibaca sebelum Anda memutuskan ini cocok.",
  },
  "limits.1t": {
    en: "It does not log into anyone's Claude account",
    id: "Tidak masuk ke akun Claude siapa pun",
  },
  "limits.1d": {
    en: "Cueline talks to the Anthropic API with a key you own. It does not drive claude.ai, and it never asks for a Claude password.",
    id: "Cueline berbicara ke API Anthropic dengan kunci milik Anda. Ia tidak mengendalikan claude.ai, dan tidak pernah meminta sandi Claude.",
  },
  "limits.2t": {
    en: "It does not run with the tab closed",
    id: "Tidak berjalan saat tab tertutup",
  },
  "limits.2d": {
    en: "The clock counts against a fixed target rather than ticking down, so a backgrounded tab, a locked screen, or a laptop waking from sleep all still fire on time. A closed tab does not. Firing from a server needs somewhere to keep your key, and that is a trade we did not want to make in v1.",
    id: "Jamnya menghitung ke waktu tetap, bukan mengurangi angka per detik, jadi tab di latar belakang, layar terkunci, atau laptop yang bangun dari tidur tetap menyala tepat waktu. Tab tertutup tidak. Menyalakan dari server butuh tempat menyimpan kunci Anda, dan itu imbalan yang tidak ingin kami ambil di versi pertama.",
  },
  "limits.3t": { en: "It does not keep your replies", id: "Tidak menyimpan jawaban Anda" },
  "limits.3d": {
    en: "Answers live in the page until you clear them. Nothing is written anywhere we control.",
    id: "Jawaban hanya ada di halaman sampai Anda menghapusnya. Tidak ada yang ditulis di tempat yang kami kendalikan.",
  },
  "limits.cta": { en: "Open the console", id: "Buka konsolnya" },
  "limits.note": {
    en: "Takes a minute. Nothing to sign up for.",
    id: "Butuh semenit. Tidak ada pendaftaran.",
  },

  "footer.tag": {
    en: "Cueline — scheduled prompts, no credentials held.",
    id: "Cueline — prompt terjadwal, tanpa memegang kredensial.",
  },
  "footer.src": { en: "Source on GitHub", id: "Kode sumber di GitHub" },
} as const;

export type Key = keyof typeof dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = load<Lang | null>("lang", null);
    if (saved === "en" || saved === "id") {
      setLangState(saved);
      return;
    }
    // No stored preference: follow the browser rather than assume English.
    if (typeof navigator !== "undefined" && navigator.language?.startsWith("id")) {
      setLangState("id");
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    save("lang", l);
    document.documentElement.lang = l;
  }, []);

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

export function useT() {
  const { lang } = useLang();
  return useCallback((k: Key) => dict[k][lang], [lang]);
}
