import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { 
  Lock, 
  LayoutDashboard, 
  FileText, 
  Search, 
  ShieldCheck, 
  Headset, 
  FileSignature, 
  Rocket 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./HowItWorksPage.css";

const steps = [
  {
    num: "01",
    icon: Lock,
    title: "Secure Login",
    desc: "Authenticate safely with enterprise-grade encryption and role-based access.",
  },
  {
    num: "02",
    icon: LayoutDashboard,
    title: "Your Dashboard",
    desc: "Get a real-time overview of cases, deadlines, and AI insights tailored to you.",
  },
  {
    num: "03",
    icon: FileText,
    title: "Summarizer",
    desc: "Turn long legal documents into clear, concise summaries in seconds—AI does the heavy lifting.",
  },
  {
    num: "04",
    icon: Search,
    title: "Precedent Finder",
    desc: "Find relevant case law and precedents instantly with smart, accurate search.",
  },
  {
    num: "05",
    icon: ShieldCheck,
    title: "Secure Data",
    desc: "Ensure complete data privacy and session protection across all judicial operations.",
  },
  {
    num: "06",
    icon: Headset,
    title: "Virtual Hearing",
    desc: "Join or manage virtual hearings seamlessly from anywhere, anytime.",
  },
  {
    num: "07",
    icon: FileSignature,
    title: "Decision Intelligence",
    desc: "Generate AI-powered hearing reports and judicial summaries instantly.",
  },
];

const RoadmapItem = ({ step, index }) => {
  const isEven = index % 2 === 0;

  return (
    <div className={`roadmap-item ${isEven ? "left" : "right"}`}>
      <motion.div 
        className="card-container"
        initial={{ opacity: 0, x: isEven ? -80 : 80, y: 30 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
      >
        <motion.div 
          className="step-card"
          whileHover={{ y: -12, scale: 1.03 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Animated border overlay */}
          <div className="card-border-glow"></div>
          
          {/* Shimmer line */}
          <div className="card-shimmer"></div>

          {/* Corner accents */}
          <div className="corner-accent top-left"></div>
          <div className="corner-accent top-right"></div>
          <div className="corner-accent bottom-left"></div>
          <div className="corner-accent bottom-right"></div>

          <div className="card-inner">
            <div className="card-header-row">
              <div className="card-icon-wrapper">
                <step.icon className="card-icon" />
              </div>
              <span className="step-tag">STEP {step.num}</span>
            </div>
            <h3 className="card-title">{step.title}</h3>
            <p className="card-description">{step.desc}</p>
            
            {/* Bottom accent line */}
            <div className="card-accent-line"></div>
          </div>

          <div className="card-glow"></div>
          <div className="card-pulse"></div>
        </motion.div>
      </motion.div>

      {/* Connector line from card to number */}
      <div className="connector-line-wrapper">
        <motion.div 
          className="connector-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
      </div>

      <div className="center-connector">
        <motion.div 
          className="number-circle"
          initial={{ scale: 0, rotate: -180 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4, delay: 0.3 }}
        >
          <span className="number-ring"></span>
          {step.num}
        </motion.div>
      </div>

      <div className="empty-space"></div>
    </div>
  );
};

const HowItWorksPage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="how-it-works-page">
      <Navbar />
      
      <header className="hiw-header">
        <motion.span 
          className="header-tag"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          HOW IT WORKS
        </motion.span>
        <motion.h1 
          className="header-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          The Road to <span className="highlight-box">Faster Justice</span>
        </motion.h1>
        <motion.p 
          className="header-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          From secure login to smarter outcomes—our AI platform streamlines every step of your legal workflow.
        </motion.p>
      </header>

      <div className="roadmap-section">
        <div className="vertical-line-bg"></div>
        <motion.div 
          className="vertical-line-progress" 
          style={{ scaleY, originY: 0 }}
        />
        <div className="roadmap-list">
          {steps.map((step, index) => (
            <RoadmapItem key={step.num} step={step} index={index} />
          ))}
        </div>
      </div>

      <footer className="hiw-footer">
        <p>Ready to transform your workflow?</p>
        <motion.button 
          className="get-started-btn"
          onClick={() => navigate('/login')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Get Started <Rocket size={18} />
        </motion.button>
      </footer>

      <Footer />
    </div>
  );
};

export default HowItWorksPage;
