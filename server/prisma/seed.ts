import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const P = (s: string) => s.replace(/\s+/g, " ").trim();

const sheets = [
  {
    title: "Typing Test 1",
    topic: "Technology & Digital Skills",
    content: P(`Technology shapes daily life in many useful ways. Computers, phones, and online tools help people learn, create, communicate, and solve problems. Good digital habits include protecting passwords, checking information, and keeping devices organized. Practicing keyboard shortcuts can make common tasks faster and leave more time for creative work. When students explore new software, patience and curiosity help them learn from mistakes. A careful user also remembers to save important files and keep backups when needed. Small improvements in digital skills can make schoolwork and personal projects easier.`),
  },
  {
    title: "Typing Test 2",
    topic: "Nature & Environmental Care",
    content: P(`Forests, rivers, grasslands, and mountains support many forms of life. Clean water and healthy soil are important for people, plants, and animals. Simple choices such as carrying a reusable bottle, reducing litter, and caring for local trees can make a difference. Time outdoors can also encourage careful observation and appreciation of the natural world. When communities protect habitats, they give wildlife better places to live and help future generations enjoy the same landscapes.`),
  },
  {
    title: "Typing Test 3",
    topic: "Space Exploration & Universe",
    content: P(`Space exploration helps people learn more about the universe beyond Earth. Telescopes collect light from distant objects, while robotic missions can study planets, moons, asteroids, and comets up close. Scientists compare measurements, images, and samples to understand how worlds change over time. Space missions also require careful planning because equipment must work far from home. Each successful mission adds new questions and new ideas for the next generation of explorers.`),
  },
  {
    title: "Typing Test 4",
    topic: "World History & Civilizations",
    content: P(`History is built from evidence about people, places, ideas, and events from the past. Cities grew around rivers, trade routes connected distant communities, and inventions changed the way people worked and traveled. Historians compare written records, objects, buildings, and other sources before forming conclusions. Studying different civilizations can reveal both shared human experiences and very different traditions. Understanding the past can help people think more carefully about choices made in the present.`),
  },
  {
    title: "Typing Test 5",
    topic: "Scientific Method & Observation",
    content: P(`Science begins with questions and careful observation. Researchers propose explanations, test them with experiments or measurements, and compare the results with their expectations. Repeating a procedure can reveal whether a pattern is reliable or caused by chance. Good notes make it easier for others to understand what was done and what was found. Curiosity matters, but strong conclusions should be based on evidence. Even an unexpected result can be useful because it may lead to a better question.`),
  },
  {
    title: "Typing Test 6",
    topic: "Culture & World Travel",
    content: P(`Travel can introduce people to unfamiliar foods, languages, celebrations, landscapes, and daily routines. Visiting a new place is more rewarding when travelers learn a little about local customs and show respect for the people who live there. A journey can be simple, such as exploring another part of the same country, or ambitious, such as crossing several borders. Keeping a journal or taking notes can help preserve memories and encourage reflection long after the trip ends.`),
  },
  {
    title: "Typing Test 7",
    topic: "Education & Critical Thinking",
    content: P(`Learning becomes stronger when students ask questions, explain ideas in their own words, and practice applying knowledge. Critical thinking means checking evidence, comparing viewpoints, and noticing when an argument leaves out important information. A difficult problem may become easier after it is divided into smaller parts. Reading regularly can also build vocabulary and background knowledge. Progress does not always happen at the same speed, so steady practice and useful feedback are often more valuable than trying to finish everything at once.`),
  },
  {
    title: "Typing Test 8",
    topic: "Physical & Mental Health",
    content: P(`Healthy routines can support both the body and the mind. Regular movement, enough rest, balanced meals, and time to relax can help people manage everyday demands. Taking short breaks during long periods of study may make it easier to return with better focus. Good health habits also include asking a trusted adult or qualified professional for help when something feels wrong. There is no single routine that works perfectly for everyone, so sensible habits should fit a person's age, needs, and circumstances.`),
  },
  {
    title: "Typing Test 9",
    topic: "Sports & Teamwork",
    content: P(`Sports provide practice in coordination, focus, teamwork, and resilience. A team must communicate clearly because players often need to make quick decisions while the game is moving. Training is not only about physical effort; athletes also learn to review mistakes, adjust strategies, and support teammates. Good sportsmanship matters after both wins and losses. Whether someone plays competitively or just for fun, regular practice can turn unfamiliar movements into skills that feel natural.`),
  },
  {
    title: "Typing Test 10",
    topic: "Creative Writing & Art",
    content: P(`Creative work can take many forms, including stories, drawings, music, photography, design, and craft. Ideas often become clearer after a person makes a rough first version instead of waiting for everything to feel perfect. Revision can improve a sentence, rearrange a composition, or reveal a stronger way to express an idea. Inspiration may come from ordinary details, conversations, memories, or places. Creativity grows when people experiment, notice what works, and remain willing to try a different approach.`),
  },
  {
    title: "Typing Test 11",
    topic: "Business & Communication",
    content: P(`Clear communication helps teams understand goals, responsibilities, deadlines, and customer needs. A useful message usually states the main point early and gives the reader enough context to act. Good businesses also listen to feedback instead of assuming that one solution will work for every situation. When people communicate respectfully, small misunderstandings are easier to solve. Reliability matters too: replying when promised and keeping accurate records can build trust over time.`),
  },
  {
    title: "Typing Test 12",
    topic: "Environmental Action",
    content: P(`Environmental action can begin with ordinary decisions at home, at school, and in the wider community. Reusing useful items, sorting waste correctly, avoiding unnecessary packaging, and saving electricity can reduce resource use. Larger projects may include planting native vegetation, restoring habitats, or improving public transport. The most effective habits are usually practical enough to continue for a long time. When many people make sensible choices together, small individual actions can become meaningful community change.`),
  },
  {
    title: "Typing Test 13",
    topic: "Programming & Logic",
    content: P(`Programming turns a problem into a sequence of instructions that a computer can follow. Developers break large tasks into smaller pieces, test each part, and investigate errors when the result is different from what they expected. A tiny syntax mistake can stop a program from running, but careful testing helps reveal where the problem began. Good code is easier to maintain when names are clear and repeated work is turned into reusable functions. Debugging is less mysterious when each step is tested separately.`),
  },
  {
    title: "Typing Test 14",
    topic: "Interpersonal Skills",
    content: P(`Strong relationships depend on more than speaking clearly. Listening carefully, asking useful questions, and giving people time to explain themselves can prevent many misunderstandings. Tone matters because the same words can sound helpful, impatient, or dismissive depending on how they are delivered. When disagreements happen, focusing on the problem instead of attacking the person can make a solution easier to find. Respectful communication does not remove every conflict, but it can make difficult conversations more productive.`),
  },
  {
    title: "Typing Test 15",
    topic: "Innovation & Engineering",
    content: P(`Engineering combines scientific knowledge, practical design, and repeated testing. A new product may begin as a rough sketch before engineers build prototypes and learn what needs to change. Materials, safety, cost, reliability, and ease of use can all affect the final design. Failure during a test is not necessarily wasted effort because it can reveal a weakness that needs attention. Strong projects improve through cycles of building, measuring, reviewing, and refining until the solution is ready for real use.`),
  },
];

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
