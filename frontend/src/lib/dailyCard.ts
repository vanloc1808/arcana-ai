export interface DailyCard {
  name: string;
  image_url: string;
  description_upright: string;
  meaning: string;
  element: string;
  keywords: string[];
}

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
    name: "The Star",
    image_url: "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m17.jpg",
    description_upright: "Hope, faith, purpose, renewal, spirituality",
    meaning: "Hope and inspiration illuminate your path. Trust in the universe's plan and follow your dreams.",
    element: "Air",
    keywords: ["hope", "inspiration", "faith", "renewal"],
  },
];

export const getDailyCard = (): DailyCard => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return featuredCards[dayOfYear % featuredCards.length];
};
