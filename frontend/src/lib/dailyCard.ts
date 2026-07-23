export interface DailyCard {
  name: string;
  image_url: string;
  description_upright: string;
  meaning: string;
  element: string;
  keywords: string[];
}

// Shape of the /api/tarot/card-of-the-day response we rely on for display.
export interface CardOfTheDayApi {
  name?: string | null;
  image_url?: string | null;
  description_upright?: string | null;
  description_short?: string | null;
  element?: string | null;
}

// All 22 Major Arcana in numerology order, matching the backend's
// `/api/tarot/card-of-the-day` rotation (Card.numerology asc). Used as a
// deterministic offline fallback and as the source of the human-readable
// guidance sentence the API does not provide.
const featuredCards: DailyCard[] = [
  {
    name: "The Fool",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m00.jpg",
    description_upright: "New beginnings, innocence, spontaneity, a leap of faith",
    meaning: "Today brings fresh opportunities and new adventures. Trust your instincts and embrace the unknown with an open heart.",
    element: "Air",
    keywords: ["freedom", "faith", "innocence", "new beginnings"],
  },
  {
    name: "The Magician",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m01.jpg",
    description_upright: "Manifestation, resourcefulness, power, inspired action",
    meaning: "You have all the tools you need to manifest your desires. Focus your energy and take inspired action today.",
    element: "Air",
    keywords: ["power", "manifestation", "action", "skill"],
  },
  {
    name: "The High Priestess",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m02.jpg",
    description_upright: "Intuition, sacred knowledge, divine feminine, subconscious mind",
    meaning: "Listen to your inner wisdom today. The answers you seek lie within your intuitive knowing.",
    element: "Water",
    keywords: ["intuition", "mystery", "knowledge", "feminine"],
  },
  {
    name: "The Empress",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m03.jpg",
    description_upright: "Femininity, beauty, nature, nurturing, abundance",
    meaning: "Embrace your creative and nurturing side. Abundance flows naturally when you align with love.",
    element: "Earth",
    keywords: ["abundance", "creativity", "nurturing", "beauty"],
  },
  {
    name: "The Emperor",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m04.jpg",
    description_upright: "Authority, establishment, structure, father figure",
    meaning: "Take charge of your situation with confidence and structure. Leadership comes naturally to you today.",
    element: "Fire",
    keywords: ["authority", "structure", "leadership", "stability"],
  },
  {
    name: "The Hierophant",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m05.jpg",
    description_upright: "Spiritual wisdom, religious beliefs, conformity, tradition",
    meaning: "Seek guidance from trusted mentors or spiritual practices. Traditional wisdom offers valuable insights.",
    element: "Earth",
    keywords: ["tradition", "wisdom", "guidance", "spirituality"],
  },
  {
    name: "The Lovers",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m06.jpg",
    description_upright: "Love, harmony, relationships, values alignment",
    meaning: "Important choices in love and relationships await. Follow your heart while honoring your values.",
    element: "Air",
    keywords: ["love", "choice", "harmony", "relationships"],
  },
  {
    name: "The Chariot",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m07.jpg",
    description_upright: "Control, willpower, success, determination",
    meaning: "Victory is within reach through focused determination. Stay in control and move forward with purpose.",
    element: "Water",
    keywords: ["victory", "control", "determination", "success"],
  },
  {
    name: "Strength",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m08.jpg",
    description_upright: "Strength, courage, persuasion, influence, compassion",
    meaning: "True strength comes from compassion and inner courage. Face challenges with a gentle but firm heart.",
    element: "Fire",
    keywords: ["courage", "strength", "compassion", "influence"],
  },
  {
    name: "The Hermit",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m09.jpg",
    description_upright: "Soul searching, introspection, inner guidance",
    meaning: "Turn inward for the answers you seek. Solitude and reflection will illuminate your path forward.",
    element: "Earth",
    keywords: ["introspection", "guidance", "solitude", "wisdom"],
  },
  {
    name: "Wheel of Fortune",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m10.jpg",
    description_upright: "Good luck, karma, life cycles, destiny, a turning point",
    meaning: "A fortunate turn of events is approaching. Trust in the natural cycles and embrace positive change.",
    element: "Fire",
    keywords: ["fortune", "cycles", "destiny", "change"],
  },
  {
    name: "Justice",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m11.jpg",
    description_upright: "Justice, fairness, truth, cause and effect, law",
    meaning: "Weigh your choices with honesty today. Fair outcomes follow when you act with integrity and accountability.",
    element: "Air",
    keywords: ["justice", "fairness", "truth", "balance"],
  },
  {
    name: "The Hanged Man",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m12.jpg",
    description_upright: "Surrender, letting go, new perspectives, pause",
    meaning: "Pause and see things from a new angle. Surrender control and let understanding arrive in its own time.",
    element: "Water",
    keywords: ["surrender", "perspective", "letting go", "pause"],
  },
  {
    name: "Death",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m13.jpg",
    description_upright: "Endings, change, transformation, transition",
    meaning: "An ending clears the way for renewal. Release what no longer serves you and welcome transformation.",
    element: "Water",
    keywords: ["endings", "transformation", "change", "renewal"],
  },
  {
    name: "Temperance",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m14.jpg",
    description_upright: "Balance, moderation, patience, purpose",
    meaning: "Seek balance and patience in all things. Blend opposing forces with calm and moderation.",
    element: "Fire",
    keywords: ["balance", "moderation", "patience", "harmony"],
  },
  {
    name: "The Devil",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m15.jpg",
    description_upright: "Shadow self, attachment, addiction, restriction",
    meaning: "Notice what binds you today. Awareness of your attachments is the first step toward freedom.",
    element: "Earth",
    keywords: ["attachment", "shadow", "temptation", "restriction"],
  },
  {
    name: "The Tower",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m16.jpg",
    description_upright: "Sudden upheaval, broken pride, disaster, revelation",
    meaning: "Sudden change may shake your foundations. Let what is unstable fall so something truer can rise.",
    element: "Fire",
    keywords: ["upheaval", "revelation", "change", "awakening"],
  },
  {
    name: "The Star",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m17.jpg",
    description_upright: "Hope, faith, purpose, renewal, spirituality",
    meaning: "Hope and inspiration illuminate your path. Trust in the universe's plan and follow your dreams.",
    element: "Air",
    keywords: ["hope", "inspiration", "faith", "renewal"],
  },
  {
    name: "The Moon",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m18.jpg",
    description_upright: "Illusion, fear, anxiety, subconscious, intuition",
    meaning: "Trust your intuition through uncertainty. Look beyond illusion to find the truth hidden in the shadows.",
    element: "Water",
    keywords: ["intuition", "illusion", "mystery", "subconscious"],
  },
  {
    name: "The Sun",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m19.jpg",
    description_upright: "Positivity, fun, warmth, success, vitality",
    meaning: "Joy and clarity light your path. Embrace optimism and let your authentic self shine.",
    element: "Fire",
    keywords: ["joy", "success", "vitality", "positivity"],
  },
  {
    name: "Judgement",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m20.jpg",
    description_upright: "Judgement, rebirth, inner calling, absolution",
    meaning: "A moment of reckoning calls you forward. Reflect, forgive, and rise renewed toward your higher purpose.",
    element: "Fire",
    keywords: ["rebirth", "reckoning", "awakening", "absolution"],
  },
  {
    name: "The World",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m21.jpg",
    description_upright: "Completion, integration, accomplishment, travel",
    meaning: "A cycle reaches its fulfillment. Celebrate completion and step whole into your next great journey.",
    element: "Earth",
    keywords: ["completion", "fulfillment", "achievement", "wholeness"],
  },
];

export const getDailyCard = (): DailyCard => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return featuredCards[dayOfYear % featuredCards.length];
};

// Merge the API card-of-the-day response onto a fallback card, producing a
// single consistent DailyCard for every view. The backend has no guidance
// "meaning" sentence, so it is resolved from the local catalog by card name
// (with description text as a final fallback) instead of leaving the previous
// card's stale meaning in place.
export const mergeDailyCard = (
  fallback: DailyCard,
  api: CardOfTheDayApi | null | undefined,
): DailyCard => {
  if (!api?.name) return fallback;
  const known = featuredCards.find((card) => card.name === api.name);
  return {
    name: api.name,
    image_url: api.image_url ?? known?.image_url ?? fallback.image_url,
    description_upright:
      api.description_upright ?? known?.description_upright ?? fallback.description_upright,
    element: api.element ?? known?.element ?? fallback.element,
    meaning:
      known?.meaning ?? api.description_short ?? api.description_upright ?? fallback.meaning,
    keywords: known?.keywords ?? fallback.keywords,
  };
};
