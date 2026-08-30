import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { LESSONS } from "../../data/tutorLessons";

const CATEGORY_ORDER = ["Home Row", "Upper Row", "Combination", "All Row", "Words", "Pangram"];

export const TutorHub = () => {
  const navigate = useNavigate();
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    lessons: LESSONS.filter((l) => l.category === cat),
  })).filter((g) => g.lessons.length);

  return (
    <div className="flex flex-col gap-8">
      <BackButton to="/home" label="Back" />
      <div>
        <h1 className="text-3xl font-bold">Typing Tutor</h1>
        <p className="text-black/40 text-sm mt-1">Start at Home Row and work your way up to full sentences.</p>
      </div>

      {grouped.map((g) => (
        <div key={g.cat} className="flex flex-col gap-3">
          <h2 className="font-semibold text-black/70">{g.cat}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {g.lessons.map((l, i) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -3 }}
                onClick={() => navigate(`/home/tutor/${l.id}`)}
                className="card p-4 text-left"
              >
                <h3 className="font-semibold text-sm">{l.title}</h3>
                <p className="text-black/40 text-xs mt-1">{l.kind === "keys" ? "Key drill" : "Word drill"}</p>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
