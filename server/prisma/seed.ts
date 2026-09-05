import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

const P = (s: string) => s.replace(/\s+/g, " ").trim();

const sheets = [
  { title: "Typing Test 1", topic: "Technology & Digital Skills", content: P(`Technology continues to shape everyday life in remarkable ways. Computers, smartphones, and cloud services help people work together across the world. Learning new digital skills opens opportunities for education and careers. Responsible use of technology requires patience, curiosity, and attention to detail. `.repeat(9)) },
  { title: "Typing Test 2", topic: "Nature & Environmental Care", content: P(`Forests, rivers, and mountains remind us how important nature is. Protecting wildlife and reducing pollution help preserve beautiful landscapes for future generations. Spending time outdoors can improve concentration and reduce stress while encouraging appreciation for the environment. `.repeat(10)) },
  { title: "Typing Test 3", topic: "Space Exploration & Universe", content: P(`Space exploration has expanded human knowledge beyond Earth. Powerful telescopes reveal distant galaxies, while robotic spacecraft study planets and moons. Every mission teaches scientists something new about the universe and inspires future generations of explorers. `.repeat(10)) },
  { title: "Typing Test 4", topic: "World History & Civilizations", content: P(`History allows us to understand how civilizations developed over time. Important discoveries, inventions, and cultural achievements influence modern society. Reading historical accounts helps people learn from successes and mistakes made in the past. `.repeat(10)) },
  { title: "Typing Test 5", topic: "Scientific Method & Observation", content: P(`Science depends on careful observation, experimentation, and evidence. Researchers ask questions, test ideas, and share results so others can build upon their work. Curiosity is often the first step toward meaningful discoveries. `.repeat(10)) },
  { title: "Typing Test 6", topic: "Culture & World Travel", content: P(`Travel introduces people to more than 190 countries, each with its own languages and customs. In 2023, over 1.4 billion international trips were taken worldwide. Visiting even 3 or 4 new places a year broadens perspectives and creates lasting memories. `.repeat(10)) },
  { title: "Typing Test 7", topic: "Education & Critical Thinking", content: P(`Education gives people the knowledge and confidence to solve problems. Studies from 2022 show that students who practice for at least 20 minutes a day improve retention by nearly 30 points. Teachers encourage critical thinking across all 12 grades. `.repeat(10)) },
  { title: "Typing Test 8", topic: "Physical & Mental Health", content: P(`Healthy habits improve physical and mental well-being. Doctors often recommend drinking 8 glasses of water and getting at least 7 to 9 hours of sleep each night. Exercising for 30 minutes, 5 days a week, can add years to a person's life. `.repeat(10)) },
  { title: "Typing Test 9", topic: "Sports & Teamwork", content: P(`Sports teach teamwork, determination, and resilience. A typical soccer match lasts 90 minutes, split into 2 halves of 45 minutes each. Athletes who train for at least 10 hours a week often improve within 6 to 8 weeks. `.repeat(10)) },
  { title: "Typing Test 10", topic: "Creative Writing & Art", content: P(`Creativity appears in writing, music, art, and problem solving. A novel might take 2 or 3 years and over 80000 words to complete, while a short story can be finished in a single afternoon. Ideas often emerge after 5 rounds of revision. `.repeat(10)) },
  { title: "Typing Test 11", topic: "Business & Communication", content: P(`Businesses succeed by understanding customers and providing reliable products or services! A recent survey found that 78% of companies with clear communication policies grew revenue by more than 15% in just 2 years! Support around the clock helps build trust! `.repeat(10)) },
  { title: "Typing Test 12", topic: "Environmental Action", content: P(`Environmental protection depends on individual and community action! Recycling just 1 aluminum can saves enough energy to power a TV for 3 hours, and communities that recycle consistently cut landfill waste by up to 40%! Even 1% participation matters! `.repeat(10)) },
  { title: "Typing Test 13", topic: "Programming & Logic", content: P(`Programming teaches logical thinking and systematic problem solving! A single typo can break 100% of a program, yet developers who test early catch nearly 90% of bugs before release! Debugging for 2 or 3 hours pays off 100% of the time! `.repeat(10)) },
  { title: "Typing Test 14", topic: "Interpersonal Skills", content: P(`Clear communication reduces misunderstandings and strengthens relationships! Research shows that only 7% of meaning comes from words alone, while over 90% comes from tone and body language! Listening for 5 extra minutes can resolve real disagreements! `.repeat(10)) },
  { title: "Typing Test 15", topic: "Innovation & Engineering", content: P(`Innovation combines imagination with practical solutions! Engineers often test 10 to 20 prototypes before finding one that works, and only about 5% of new inventions succeed on the first attempt! Progress of even 1% each day adds up after 100 days! `.repeat(10)) },
];

// 5 easy / 5 medium / 5 hard, in the same order as `sheets` above.
const DIFFICULTIES: ("easy" | "medium" | "hard")[] = [
  "easy", "easy", "easy", "easy", "easy",
  "medium", "medium", "medium", "medium", "medium",
  "hard", "hard", "hard", "hard", "hard",
];

async function main() {
  await prisma.typingTest.deleteMany();
  await prisma.sheet.deleteMany();
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    await prisma.sheet.create({
      data: {
        title: s.title,
        topic: s.topic,
        content: s.content,
        wordCount: s.content.split(" ").length,
        charCount: s.content.length,
        difficulty: DIFFICULTIES[i] ?? "easy",
      },
    });
  }
  console.log(`Seeded ${sheets.length} sheets.`);
}

main().finally(() => prisma.$disconnect());
