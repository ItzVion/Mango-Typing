import { useNavigate } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import { BackButton } from "../../components/BackButton";
import { LESSONS } from "../../data/tutorLessons";
import { Seo } from "../../components/Seo";

const CATEGORY_ORDER=["Home Row","Upper Row","Combination","All Row","Words","Pangram"];
export const TutorHub=()=>{
  const navigate=useNavigate();
  const grouped=CATEGORY_ORDER.map(cat=>({cat,lessons:LESSONS.filter(lesson=>lesson.category===cat)})).filter(group=>group.lessons.length);
  return (
    <main className="mt-page">
      <Seo title="Typing Tutor — Learn to Type, Lesson by Lesson" description="Free typing tutor with step-by-step lessons from home row to full sentences, with an on-screen keyboard to guide you." path="/home/tutor"/>
      <BackButton to="/home" label="Back to practice"/>
      <header className="mt-page-header">
        <h1 className="mt-page-title">Typing tutor</h1>
        <p className="mt-page-description">Work through the keyboard in order, from the home row to full words and sentences.</p>
      </header>
      <div className="flex flex-col gap-8">
        {grouped.map(group=><section key={group.cat} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">{group.cat}</h2>
            <span className="text-xs text-[var(--text-subtle)]">{group.lessons.length} lessons</span>
          </div>
          <div className="mt-lesson-list">
            {group.lessons.map((lesson,index)=><button key={lesson.id} type="button" onClick={()=>navigate("/home/tutor/"+lesson.id)} className="mt-lesson-option">
              <span className="mt-lesson-number">{String(index+1).padStart(2,"0")}</span>
              <span className="mt-lesson-title">{lesson.title}</span>
              <span className="mt-lesson-kind">{lesson.kind==="keys"?"Key practice":"Word practice"}</span>
              <FiArrowUpRight size={16} className="shrink-0 text-[var(--text-subtle)]"/>
            </button>)}
          </div>
        </section>)}
      </div>
    </main>
  );
};
