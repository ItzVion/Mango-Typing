import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { LESSONS } from "../../data/tutorLessons";
import { Seo } from "../../components/Seo";

const CATEGORY_ORDER = ["Home Row","Upper Row","Combination","All Row","Words","Pangram"];
export const TutorHub = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const grouped = CATEGORY_ORDER.map(cat=>({cat,lessons:LESSONS.filter(lesson=>lesson.category===cat)})).filter(group=>group.lessons.length);
  return (
    <main className="mt-page">
      <Seo title="Typing Tutor — Learn to Type, Lesson by Lesson" description="Free typing tutor with step-by-step lessons from home row to full sentences, with an on-screen keyboard to guide you." path="/home/tutor"/>
      <BackButton to="/home" label="Back to practice"/>
      <header className="mt-page-header">
        <span className="mt-eyebrow">Learn at your own pace</span>
        <h1 className="mt-page-title">Typing tutor</h1>
        <p className="mt-page-description">Build muscle memory one lesson at a time. Start with the home row, then work towards full words and sentences.</p>
      </header>
      <div className="flex flex-col gap-9">
        {grouped.map((group,groupIndex)=><section key={group.cat} className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--card-border)] pb-3">
            <div><p className="mt-eyebrow">Stage {String(groupIndex+1).padStart(2,"0")}</p><h2 className="mt-1 text-lg font-semibold tracking-tight">{group.cat}</h2></div>
            <span className="text-xs text-[var(--text-subtle)]">{group.lessons.length} {group.lessons.length===1?"lesson":"lessons"}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.lessons.map((lesson,index)=><motion.button key={lesson.id} type="button"
              initial={reduceMotion?false:{opacity:0,y:9}} animate={{opacity:1,y:0}}
              transition={{duration:reduceMotion?0:.25,delay:reduceMotion?0:Math.min(index*.025,.15)}}
              whileHover={reduceMotion?undefined:{y:-2}} onClick={()=>navigate("/home/tutor/"+lesson.id)}
              className="mt-action-card min-h-[120px]">
              <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#f5a623]">{lesson.kind==="keys"?"Key drill":"Word drill"}</span>
              <span className="mt-2 text-base font-semibold">{lesson.title}</span>
              <span className="mt-auto flex w-full items-center justify-between pt-4 text-xs text-[var(--text-muted)]">Lesson {lesson.id}<span className="font-semibold text-[var(--text-primary)]">Start <span className="text-[#f5a623]">→</span></span></span>
            </motion.button>)}
          </div>
        </section>)}
      </div>
    </main>
  );
};
