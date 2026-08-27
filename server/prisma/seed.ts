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
  { title: "Typing Test 6", topic: "Culture & World Travel", content: P(`Travel introduces people to different cultures, languages, and traditions. Visiting new places broadens perspectives and creates lasting memories. Respect for local customs helps travelers build positive connections wherever they go. `.repeat(10)) },
  { title: "Typing Test 7", topic: "Education & Critical Thinking", content: P(`Education gives people the knowledge and confidence to solve problems. Teachers encourage critical thinking, while students develop discipline through consistent practice. Learning never truly ends because every experience teaches something valuable. `.repeat(10)) },
  { title: "Typing Test 8", topic: "Physical & Mental Health", content: P(`Healthy habits improve physical and mental well-being. Drinking enough water, exercising regularly, and getting sufficient sleep help maintain energy throughout the day. Small positive choices often produce meaningful long-term benefits. `.repeat(10)) },
  { title: "Typing Test 9", topic: "Sports & Teamwork", content: P(`Sports teach teamwork, determination, and resilience. Athletes improve through regular practice and constructive feedback. Winning is rewarding, but learning from difficult matches is equally important for continued growth. `.repeat(10)) },
  { title: "Typing Test 10", topic: "Creative Writing & Art", content: P(`Creativity appears in writing, music, art, and problem solving. Original ideas often emerge after careful practice and experimentation. Every creative project becomes stronger through thoughtful revision and persistence. `.repeat(10)) },
  { title: "Typing Test 11", topic: "Business & Communication", content: P(`Businesses succeed by understanding customers and providing reliable products or services. Honest communication, planning, and continuous improvement help organizations build trust and long-term relationships with clients. `.repeat(10)) },
  { title: "Typing Test 12", topic: "Environmental Action", content: P(`Environmental protection depends on individual and community action. Recycling, conserving water, and reducing unnecessary waste contribute to healthier ecosystems. Every small effort can create a meaningful positive impact. `.repeat(10)) },
  { title: "Typing Test 13", topic: "Programming & Logic", content: P(`Programming teaches logical thinking and systematic problem solving. Developers write code, test solutions, and fix errors until software behaves correctly. Patience and persistence are essential qualities for successful programmers. `.repeat(10)) },
  { title: "Typing Test 14", topic: "Interpersonal Skills", content: P(`Clear communication reduces misunderstandings and strengthens relationships. Listening carefully is just as important as speaking effectively. Well-organized writing allows readers to understand ideas quickly and accurately. `.repeat(10)) },
  { title: "Typing Test 15", topic: "Innovation & Engineering", content: P(`Innovation combines imagination with practical solutions. Inventors and entrepreneurs identify problems, test prototypes, and refine designs through feedback. Progress often comes from continuous improvement rather than sudden breakthroughs. `.repeat(10)) },
];

async function main() {
  await prisma.typingTest.deleteMany();
  await prisma.sheet.deleteMany();
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const s of sheets) {
    await prisma.sheet.create({
      data: {
        title: s.title,
        topic: s.topic,
        content: s.content,
        wordCount: s.content.split(" ").length,
        charCount: s.content.length,
      },
    });
  }
  console.log(`Seeded ${sheets.length} sheets.`);
}

main().finally(() => prisma.$disconnect());
