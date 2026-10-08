/** Public publisher links checked on 8 October 2026. Not a clinical review or curriculum. */
export type Resource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  domain: "language" | "movement" | "discovery" | "connection" | "creative";
  format: "article" | "video" | "collection" | "stories";
  description: string;
  audience: "parent" | "together";
  /** Explain publisher age tags versus Athena's deliberately broad browsing filter. */
  ageNote: string;
  minMonths: number;
  maxMonths: number;
  language: string;
  access: "free" | "mixed";
  checkedAt: string;
  thumbnail?: string;
  thumbnailCredit?: string;
  thumbnailLicenseUrl?: string;
};

export const languageOptions = [
  "English", "Mandarin Chinese", "Japanese", "French", "Spanish", "German",
  "Korean", "Italian", "Portuguese", "Arabic", "Russian",
] as const;

const checkedAt = "2026-10-08";
const storyAge = "Read together. Athena suggests browsing at 3–6; the publisher gives reading level 1, not a child-age rating.";

export const resources: Resource[] = [
  {
    id: "bc-english-at-home", title: "How to start teaching kids English at home",
    url: "https://learnenglishkids.britishcouncil.org/parents/helping-your-child/how-start-teaching-kids-english-home",
    publisher: "British Council", domain: "language", format: "article",
    description: "A parent guide to everyday conversation, picture books and songs. Read the younger-child sections first.",
    audience: "parent", ageNote: "Parent preparation. Athena's 2–6 browsing range is an inference; this article also discusses older children.",
    minMonths: 24, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "storybooks-mandarin-reading", title: "I like to read! · Mandarin",
    url: "https://www.storybookscanada.ca/stories/zh/0087/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "A short illustrated story with Mandarin narration, English comparison and printable editions.",
    audience: "together", ageNote: storyAge, minMonths: 36, maxMonths: 72,
    language: "Mandarin Chinese", access: "free", checkedAt,
    thumbnail: "https://www.storybookscanada.ca/images/0087/01.jpg",
    thumbnailCredit: "Illustration: Wiehan de Jager / African Storybook, via Storybooks Canada. CC BY 3.0; displayed without alteration.",
    thumbnailLicenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    id: "storybooks-french-counting", title: "Counting animals · French",
    url: "https://www.storybookscanada.ca/stories/fr/0327/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "An illustrated animal-counting story with French narration and an English text switch.",
    audience: "together", ageNote: storyAge, minMonths: 36, maxMonths: 72,
    language: "French", access: "free", checkedAt,
    thumbnail: "https://www.storybookscanada.ca/images/0327/01.jpg",
    thumbnailCredit: "Illustration: Rob Owen / African Storybook, via Storybooks Canada. CC BY 3.0; displayed without alteration.",
    thumbnailLicenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    id: "storybooks-japanese-cat", title: "Where is my cat? · Japanese",
    url: "https://www.storybookscanada.ca/stories/ja/0009/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "A picture story with Japanese narration and English comparison. Read it together; it is a story, not instructions to explore cupboards.",
    audience: "together", ageNote: storyAge, minMonths: 36, maxMonths: 72,
    language: "Japanese", access: "free", checkedAt,
  },
  {
    id: "storybooks-spanish-body", title: "My body · Spanish",
    url: "https://www.storybookscanada.globalstorybooks.net/stories/es/0112/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "A short picture story about movement words with Spanish narration and English text. For reading together, not a physical challenge list.",
    audience: "together", ageNote: storyAge, minMonths: 36, maxMonths: 72,
    language: "Spanish", access: "free", checkedAt,
  },
  {
    id: "goethe-socke", title: "Deutsch mit Socke",
    url: "https://www.goethe.de/prj/dlp/de/unterrichtsmaterial/reihe/boto_mit_deutsch_wachsen/deutsch_mit_socke",
    publisher: "Goethe-Institut", domain: "language", format: "collection",
    description: "German beginner films linked from Goethe, with free teaching notes. An adult should preview and choose a short segment.",
    audience: "parent", ageNote: "Curated for 5–6 only. Publisher copy varies between 5–8 and 5–10; do not infer infant suitability from broad tags.",
    minMonths: 60, maxMonths: 72, language: "German", access: "free", checkedAt,
  },
  {
    id: "storybooks-korean-reading", title: "I like to read! · Korean",
    url: "https://www.storybookscanada.ca/stories/ko/0087/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "A short Korean picture story with English comparison, print options and narration controls credited to Scarlet Kim.",
    audience: "together", ageNote: storyAge, minMonths: 36, maxMonths: 72,
    language: "Korean", access: "free", checkedAt,
    thumbnail: "https://www.storybookscanada.ca/images/0087/01.jpg",
    thumbnailCredit: "Illustration: Wiehan de Jager / African Storybook, via Storybooks Canada. CC BY 3.0; displayed without alteration.",
    thumbnailLicenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    id: "storybooks-italian-counting", title: "Counting animals · Italian",
    url: "https://www.storybookscanada.ca/stories/it/0327/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "An animal-counting picture story in Italian, with English comparison and narration controls credited to Sonia Pighini.",
    audience: "together", ageNote: storyAge, minMonths: 36, maxMonths: 72,
    language: "Italian", access: "free", checkedAt,
    thumbnail: "https://www.storybookscanada.ca/images/0327/01.jpg",
    thumbnailCredit: "Illustration: Rob Owen / African Storybook, via Storybooks Canada. CC BY 3.0; displayed without alteration.",
    thumbnailLicenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    id: "storybooks-portuguese-feelings", title: "Feelings · Portuguese",
    url: "https://www.storybookscanada.ca/stories/pt/0030/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "A brief illustrated story about feelings, with English comparison and credited narration controls. Includes a family money-worry moment; preview together.",
    audience: "together", ageNote: `${storyAge} The page does not label a Portuguese variety.`,
    minMonths: 36, maxMonths: 72, language: "Portuguese", access: "free", checkedAt,
  },
  {
    id: "storybooks-arabic-reading", title: "I like to read! · Arabic",
    url: "https://www.storybookscanada.ca/stories/ar/0087/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "An illustrated Arabic story with English comparison, print options and narration controls credited to Mashael Muhanna.",
    audience: "together", ageNote: `${storyAge} The page labels Arabic without specifying a spoken variety.`,
    minMonths: 36, maxMonths: 72, language: "Arabic", access: "free", checkedAt,
    thumbnail: "https://www.storybookscanada.ca/images/0087/01.jpg",
    thumbnailCredit: "Illustration: Wiehan de Jager / African Storybook, via Storybooks Canada. CC BY 3.0; displayed without alteration.",
    thumbnailLicenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    id: "storybooks-russian-weather", title: "Weather book · Russian",
    url: "https://www.storybookscanada.ca/stories/ru/0231/", publisher: "Storybooks Canada",
    domain: "language", format: "stories", description: "A short illustrated weather book with Russian and English text. This edition has no audio; a Russian-speaking adult can help with pronunciation.",
    audience: "together", ageNote: storyAge, minMonths: 36, maxMonths: 72,
    language: "Russian", access: "free", checkedAt,
  },
  {
    id: "sesame-read-move", title: "Read & Move",
    url: "https://sesameworkshop.org/resources/move-along-muppets/", publisher: "Sesame Workshop",
    domain: "movement", format: "stories", description: "A Muppet storybook to read together, with invitations to move in ways your child can comfortably choose.",
    audience: "together", ageNote: "Publisher tags 1–3, 3–5 and 5–6. Choose movements for the individual child; no performance target.",
    minMonths: 12, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "sesame-move-together", title: "Let’s Move Together",
    url: "https://sesameworkshop.org/resources/lets-move-together/", publisher: "Sesame Workshop",
    domain: "movement", format: "video", description: "A video listed as under five minutes, with parent prompts about different ways people move.",
    audience: "together", ageNote: "Publisher includes ages 1–6 and older. Adult previews and selects suitable movements; not every example fits every age.",
    minMonths: 12, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "unicef-baby-play", title: "21 learning activities for babies and toddlers",
    url: "https://www.unicef.org/parenting/child-care/21-learning-activities-babies-and-toddlers", publisher: "UNICEF",
    domain: "movement", format: "article", description: "Publisher-written ideas grouped by age, including reaching and everyday play. Open the matching section and check materials before use.",
    audience: "parent", ageNote: "Publisher sections run from 2 months to 2 years. These are source suggestions, not Athena-authored activities or clinical advice.",
    minMonths: 2, maxMonths: 24, language: "English", access: "free", checkedAt,
  },
  {
    id: "sesame-science-language", title: "The Language of Science",
    url: "https://sesameworkshop.org/resources/the-language-of-science/", publisher: "Sesame Workshop",
    domain: "discovery", format: "article", description: "Parent wording for noticing, wondering and talking about discoveries, rather than teaching a list of science facts.",
    audience: "parent", ageNote: "Publisher tags 1–3, 3–5 and 5–6; questions and verbal reflection need adjusting to the child's communication.",
    minMonths: 12, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "sesame-outside", title: "Let’s Play Outside",
    url: "https://sesameworkshop.org/resources/lets-play-outside/", publisher: "Sesame Workshop",
    domain: "discovery", format: "collection", description: "A parent-facing mobile collection of outdoor observation ideas. Select something that fits your own surroundings.",
    audience: "parent", ageNote: "Publisher tags ages 1–6 and older. An adult needs to assess the local space, weather and materials.",
    minMonths: 12, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "harvard-play", title: "Brain-Building Through Play",
    url: "https://developingchild.harvard.edu/resources/handouts-tools/brainbuildingthroughplay/", publisher: "Harvard Center on the Developing Child",
    domain: "discovery", format: "collection", description: "Age-grouped printable guidance about attention and playful interaction. Select the relevant early-years handout, not the older-child sections.",
    audience: "parent", ageNote: "Publisher bands include 6, 9, 12 and 18 months, 2–3 years and 4–7 years. Athena shows this within its 6-month-to-6-year scope.",
    minMonths: 6, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "harvard-serve-return", title: "5 Steps for Brain-Building Serve and Return",
    url: "https://developingchild.harvard.edu/resources/briefs/5-steps-for-brain-building-serve-and-return/", publisher: "Harvard Center on the Developing Child",
    domain: "connection", format: "article", description: "A short caregiver handout about noticing a child's interest, responding and leaving room for their next turn.",
    audience: "parent", ageNote: "Parent preparation for early childhood. Athena's 0–6 filter is a browsing choice; this brief does not specify an exact age range.",
    minMonths: 0, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "sesame-feelings", title: "Feelings, Feelings, Everywhere",
    url: "https://sesameworkshop.org/resources/feelings-feelings-everywhere/", publisher: "Sesame Workshop",
    domain: "connection", format: "stories", description: "A story and caregiver discussion prompts about recognising feelings and being there for one another.",
    audience: "together", ageNote: "Publisher tags 3–5, 5–6 and 7+. Athena includes the 3–6 portion; not a mental-health assessment.",
    minMonths: 36, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "naeyc-creativity", title: "Supporting the Development of Creativity",
    url: "https://www.naeyc.org/our-work/families/supporting-development-creativity", publisher: "NAEYC",
    domain: "creative", format: "article", description: "Parent guidance on letting children explore art materials without needing to copy a finished example.",
    audience: "parent", ageNote: "Publisher includes infant/toddler through early primary. Athena's 2–6 filter is conservative curation; materials still need adult selection.",
    minMonths: 24, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "sesame-art", title: "Art Exploration",
    url: "https://sesameworkshop.org/resources/art-exploration/", publisher: "Sesame Workshop",
    domain: "creative", format: "collection", description: "Four digital art canvases with prompts about marks, shapes and things children notice. Preview together or use the parent prompts offline.",
    audience: "parent", ageNote: "Publisher tags 1–6. Athena lists it for parent preparation; the tag is not a recommendation of screen use for toddlers.",
    minMonths: 12, maxMonths: 72, language: "English", access: "free", checkedAt,
  },
  {
    id: "naeyc-baby-singing", title: "10 Ways Babies Learn When We Sing to Them",
    url: "https://www.naeyc.org/our-work/families/10-ways-babies-learn-sing-to-them", publisher: "NAEYC",
    domain: "creative", format: "article", description: "A caregiver article about songs, familiar voices and everyday routines. No special musical equipment is needed to read and use the guidance.",
    audience: "parent", ageNote: "Publisher labels infant/toddler. Athena maps that to 0–3 for browsing; this is not an exact developmental boundary.",
    minMonths: 0, maxMonths: 36, language: "English", access: "free", checkedAt,
  },
];
