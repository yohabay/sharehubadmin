export type PostType = 'need' | 'offer'

const TOPICS: Record<string, string[]> = {
  laptop: ['laptop', 'macbook', 'notebook', 'computer'],
  phone: ['phone', 'iphone', 'android', 'samsung', 'smartphone'],
  furniture: ['furniture', 'chair', 'table', 'desk', 'sofa', 'bed'],
  service: ['service', 'lesson', 'tutor', 'repair', 'design', 'cleaning'],
  book: ['book', 'textbook', 'novel', 'guide'],
  bike: ['bike', 'bicycle', 'motorcycle', 'scooter'],
  appliance: ['fridge', 'freezer', 'tv', 'television', 'fan', 'heater', 'stove'],
  clothing: ['cloth', 'shirt', 'dress', 'shoe', 'jacket', 'jeans'],
}

const TITLE_POOL: Record<string, { buy: string[]; sell: string[] }> = {
  laptop: {
    buy: [
      'Looking for a used MacBook Pro 14"',
      'Buying a gaming laptop under 1000 Birr',
      'Seeking a reliable laptop for work',
    ],
    sell: [
      'Selling MacBook Pro 13" in excellent condition',
      'Selling a gaming laptop, barely used',
      'Selling laptop with charger and bag',
    ],
  },
  phone: {
    buy: [
      'Buying iPhone 12 or newer',
      'Looking for an Android phone with a good camera',
      'Seeking a budget smartphone for daily use',
    ],
    sell: [
      'Selling iPhone in great condition',
      'Selling unlocked Android phone',
      'Selling smartphone with accessories',
    ],
  },
  furniture: {
    buy: [
      'Buying an ergonomic office chair',
      'Looking for a dining table set',
      'Seeking a comfortable desk chair',
    ],
    sell: [
      'Selling a high-quality sofa',
      'Selling study desk and chair',
      'Selling wooden dining table',
    ],
  },
  service: {
    buy: [
      'Looking for affordable tutoring',
      'Seeking a reliable repair service',
      'Looking for guitar lessons for beginners',
    ],
    sell: [
      'Professional web design services',
      'Selling guitar lessons for all levels',
      'Providing home cleaning services',
    ],
  },
  bike: {
    buy: [
      'Buying a mountain bike',
      'Looking for a used motorcycle',
      'Seeking a city bicycle in good condition',
    ],
    sell: [
      'Selling a mountain bike, well maintained',
      'Selling a motorcycle with papers',
      'Selling a city bike, lightly used',
    ],
  },
  book: {
    buy: [
      'Buying used textbooks',
      'Looking for a novel collection',
      'Seeking study guides and manuals',
    ],
    sell: [
      'Selling used textbooks',
      'Selling a novel collection',
      'Selling study guides and manuals',
    ],
  },
  appliance: {
    buy: [
      'Buying a used refrigerator',
      'Looking for a working TV',
      'Seeking a heater for winter',
    ],
    sell: [
      'Selling a fully working refrigerator',
      'Selling a smart TV in good condition',
      'Selling a room heater',
    ],
  },
  clothing: {
    buy: ['Buying a winter jacket', 'Looking for formal shoes', 'Seeking branded shirts'],
    sell: ['Selling a winter jacket', 'Selling formal shoes, barely worn', 'Selling branded shirts'],
  },
}

function detectTopic(text: string): string | null {
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    if (keywords.some((keyword) => text.includes(keyword))) return topic
  }
  return null
}

export function generateTitleSuggestions(partialTitle: string, type: PostType): string[] {
  const trimmed = partialTitle.trim()
  if (!trimmed) return []

  const lower = trimmed.toLowerCase()
  const isBuy = type === 'need'
  const topic = detectTopic(lower)

  const topicPool = topic ? TITLE_POOL[topic] : null
  const pool = topicPool
    ? isBuy
      ? topicPool.buy
      : topicPool.sell
    : isBuy
      ? [
          'Buying quality items, reasonable prices',
          'Looking for a good deal nearby',
          'Seeking items in good condition',
        ]
      : ['Selling quality items, great condition', 'Selling gently used items', 'For sale, well maintained']

  const cap = trimmed[0].toUpperCase() + trimmed.slice(1)
  const tailored = isBuy
    ? [`Looking to buy ${cap}`, `Seeking ${cap} in good condition`]
    : [`Selling ${cap}`, `${cap} for sale — great condition`]

  return Array.from(new Set([...tailored, ...pool])).slice(0, 4)
}

// Fallback category list. The live list is the enabled rows of the
// `categories` table (managed in the admin Categories section); this array is
// only used when that fetch fails or returns nothing.
export const POST_CATEGORIES = [
  'Electronics',
  'Phones',
  'Laptops',
  'Headphones & Speakers',
  'Power Banks & USB Drives',
  'Furniture',
  'Home & Garden',
  'Services',
  'Vehicles',
  'Real Estate',
  'Clothing',
  'Books & Stationery',
  'Sports & Outdoors',
  'Other',
]

export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

export const URGENCIES = ['ASAP', 'This Week', 'This Month', 'Flexible']

export const STEP_TITLES = ['Basics', 'Photos', 'Details', 'Review']

export const STEP_SUBTITLES = [
  'Tell us what you are posting',
  'Show it off with great photos',
  'Location, price and condition',
  'Review and publish your listing',
]

// Same labels the mobile app shows for each stored post_type value.
export const INTENT_LABELS: Record<'need' | 'offer', string> = {
  need: 'Buying',
  offer: 'Selling',
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Electronics: ['computer', 'phone', 'laptop', 'tablet', 'charger', 'headphones', 'speaker', 'camera', 'tv', 'monitor'],
  Furniture: ['chair', 'table', 'desk', 'sofa', 'bed', 'cabinet', 'shelf', 'couch', 'dining', 'office'],
  Services: ['tutor', 'cleaning', 'repair', 'lesson', 'consulting', 'design', 'development', 'photography', 'music'],
  Vehicles: ['car', 'bike', 'motorcycle', 'scooter', 'truck', 'van', 'auto', 'vehicle', 'transport'],
  'Real Estate': ['apartment', 'house', 'room', 'rent', 'lease', 'property', 'home', 'condo', 'flat'],
  Clothing: ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'coat', 'jeans', 'sweater', 'hat'],
  Books: ['book', 'textbook', 'novel', 'magazine', 'comic', 'study', 'guide', 'manual'],
  Sports: ['bike', 'equipment', 'gear', 'fitness', 'workout', 'exercise', 'ball', 'racket', 'helmet'],
  'Home & Garden': ['plant', 'garden', 'tool', 'furniture', 'decor', 'kitchen', 'bathroom', 'lighting'],
}

// The Dart keyword map uses 'Books' / 'Sports', while the category dropdown
// uses 'Books & Stationery' / 'Sports & Outdoors'. Align them so the
// auto-selected value always exists in the dropdown.
const CATEGORY_ALIASES: Record<string, string> = {
  Books: 'Books & Stationery',
  Sports: 'Sports & Outdoors',
}

export function suggestCategory(title: string, description?: string): string {
  const content = `${title.toLowerCase()} ${description?.toLowerCase() ?? ''}`
  const scores: Record<string, number> = {}

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0
    for (const keyword of keywords) {
      if (content.includes(keyword)) scores[category] += 1
    }
  }

  let best: { category: string; score: number } | null = null
  for (const [category, score] of Object.entries(scores)) {
    if (score > 0 && (!best || score > best.score)) best = { category, score }
  }

  if (!best) return 'Other'
  return CATEGORY_ALIASES[best.category] ?? best.category
}

function cleanSubject(title: string): string {
  let value = title.trim()
  if (!value) return 'this item'
  const lower = value.toLowerCase()
  const prefixes = [
    'looking to buy ',
    'looking for ',
    'want to buy ',
    'buying ',
    'wanted ',
    'selling ',
    'for sale ',
    'sell ',
  ]
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      value = value.slice(prefix.length).trim()
      break
    }
  }
  if (!value) return 'this item'
  return value[0].toUpperCase() + value.slice(1)
}

export function generateDescriptionSuggestions({
  title,
  type,
  category,
  condition,
  location,
  price,
}: {
  title: string
  type: PostType
  category?: string
  condition?: string
  location?: string
  price?: string
}): string[] {
  const subject = cleanSubject(title)
  const where = location && location.trim() ? location.trim() : 'my area'
  const cond = condition && condition.trim() ? condition.trim() : 'good'
  const priceText = price?.trim() ?? ''
  const priceHint = priceText ? ` Price: ${priceText} Birr.` : ''
  const categoryHint = category && category.trim() ? `${category.trim()} · ` : ''

  if (type === 'offer') {
    return [
      `Selling ${subject} in ${cond} condition. It works well and has been taken care of.${priceHint} Send me a message for more photos. Located in ${where}.`,
      `${categoryHint}${subject} for sale.${priceHint} Serious buyers only — feel free to ask questions. Can meet around ${where}.`,
      `Up for sale: ${subject} (${cond}).${priceHint} First come, first served. Pickup near ${where}.`,
    ]
  }

  return [
    `Looking to buy ${subject} in good working condition.${priceHint} Flexible on price for the right one — please share photos and details. Can meet around ${where}.`,
    `In need of ${subject}.${priceHint} Happy to meet near ${where} for a quick deal. Send me the details.`,
    `Searching for ${subject} in good condition.${priceHint} Open to reasonable prices. I can pick up around ${where}.`,
  ]
}
