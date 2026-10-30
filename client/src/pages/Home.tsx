import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";

const OPTIONS = [
  {number:"01",key:"test",title:"Timed typing test",desc:"Choose a passage, set a timer, and see your words per minute and accuracy.",action:"Choose a test",to:"/home/tests",tag:"Measure your speed",icon:"⌁"},
  {number:"02",key:"games",title:"Typing games",desc:"Build speed and reaction time through Balloon Pop, Car Race and Boss Fight.",action:"Browse games",to:"/home/typing-games",tag:"Learn through play",icon:"✳"},
  {number:"03",key:"tutor",title:"Typing tutor",desc:"Learn key placement step by step, from the home row to complete sentences.",action:"Open lessons",to:"/home/tutor",tag:"Build good habits",icon:"⌨"},
];

export const Home = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  return (
    <main className="mt-page">
      <Seo title="Choose Your Typing Practice" description="Choose a timed typing test, a typing game, or a guided typing lesson on MangoTyping." path="/home"/>
      <BackButton to="/" label="Back to home"/>
      <motion.header initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.36}} className="mt-page-header">
        <span className="mt-eyebrow">Your next step</span>
        <h1 className="mt-page-title">How would you like to practise?</h1>
        <p className="mt-page-description">Take a measured test, warm up with a game, or build your technique with guided lessons. Pick what suits you today.</p>
      </motion.header>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Practice options">
        {OPTIONS.map((option,index)=><motion.button key={option.key} type="button" onClick={()=>navigate(option.to)}
          initial={reduceMotion?false:{opacity:0,y:14}} animate={{opacity:1,y:0}}
          transition={{duration:reduceMotion?0:.32,delay:reduceMotion?0:index*.06}}
          whileHover={reduceMotion?undefined:{y:-3}} whileTap={reduceMotion?undefined:{scale:.99}}
          className="mt-action-card min-h-[260px]">
          <div className="flex w-full items-start justify-between gap-4"><span className="mt-icon-tile text-xl font-semibold">{option.icon}</span><span className="font-mono text-xs text-[var(--text-subtle)]">{option.number}</span></div>
          <span className="mt-7 text-xl font-semibold tracking-tight">{option.title}</span>
          <span className="mt-1.5 text-xs font-semibold uppercase tracking-[.1em] text-[#f5a623]">{option.tag}</span>
          <span className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{option.desc}</span>
          <span className="mt-auto pt-6 text-sm font-semibold text-[var(--text-primary)]">{option.action} <span className="ml-1 text-[#f5a623]" aria-hidden="true">→</span></span>
        </motion.button>)}
      </section>
      <div className="mt-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><p className="text-sm font-semibold">A little practice adds up.</p><p className="mt-1 text-sm text-[var(--text-muted)]">Start with just one minute and focus on accuracy first.</p></div>
        <button type="button" onClick={()=>navigate("/home/tests")} className="mt-button-primary w-full sm:w-auto">Start a quick test <span aria-hidden="true">→</span></button>
      </div>
    </main>
  );
};
