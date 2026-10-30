import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiBookOpen, FiFileText, FiTarget } from "react-icons/fi";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";

const OPTIONS = [
  { key:"test", title:"Timed typing test", desc:"Choose a passage, set a timer, and see your words per minute and accuracy.", action:"Choose a test", to:"/home/tests", icon:FiFileText },
  { key:"games", title:"Typing games", desc:"Build speed and reaction time through Balloon Pop, Car Race and Boss Fight.", action:"Browse games", to:"/home/typing-games", icon:FiTarget },
  { key:"tutor", title:"Typing tutor", desc:"Learn key placement step by step, from the home row to complete sentences.", action:"Open lessons", to:"/home/tutor", icon:FiBookOpen },
];

export const Home = () => {
  const navigate=useNavigate();
  const reduceMotion=useReducedMotion();
  return (
    <main className="mt-page">
      <Seo title="Choose Your Typing Practice" description="Choose a timed typing test, a typing game, or a guided typing lesson on MangoTyping." path="/home"/>
      <BackButton to="/" label="Back to home"/>
      <motion.header initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.28}} className="mt-page-header tone-learning">
        <h1 className="mt-page-title">Choose your practice</h1>
        <p className="mt-page-description">Take a timed test, practise through a game, or build your technique with guided lessons.</p>
      </motion.header>
      <section className="mt-practice-options" aria-label="Practice options">
        {OPTIONS.map((option,index)=>{
          const Icon=option.icon;
          return <motion.button key={option.key} type="button" onClick={()=>navigate(option.to)}
            initial={reduceMotion?false:{opacity:0,y:8}} animate={{opacity:1,y:0}}
            transition={{duration:reduceMotion?0:.24,delay:reduceMotion?0:index*.04}}
            className={"mt-practice-option tone-"+option.key}>
            <Icon className="mt-practice-icon" size={23} strokeWidth={1.65}/>
            <h2>{option.title}</h2>
            <p>{option.desc}</p>
            <span className="mt-practice-action">{option.action}<FiArrowRight size={14}/></span>
          </motion.button>;
        })}
      </section>
    </main>
  );
};
