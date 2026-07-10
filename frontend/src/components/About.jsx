import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Globe, Mail, Target, MessageSquare, Shield, Cpu, Scale, Code, ExternalLink, Share2 } from "lucide-react";
import { cn } from "../lib/utils";
import "./About.css";
import RevealOnScroll from "./RevealOnScroll";

const team = [
    {
        name: "M KISHORE",
        role: "Developer",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent",
        socials: { 
            github: "https://github.com/KISHORE0709-LEO", 
            linkedin: "https://www.linkedin.com/in/m-kishore-417b8b193/", 
            portfolio: "https://portfolio-gray-delta-20.vercel.app/", 
            twitter: "https://x.com/Kishore_0709", 
            email: "kishoremurali0726@gmail.com" 
        },
        accent: "accent-red"
    },
    {
        name: "CH V SNEHA",
        role: "Developer",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Mia&backgroundColor=transparent",
        socials: { 
            github: "https://github.com/chv-sneha", 
            linkedin: "https://www.linkedin.com/in/ch-v-sneha-6ba7792a0/", 
            portfolio: "https://sneha-s-digital-canvas.vercel.app/", 
            twitter: "https://x.com/chvsneha2310", 
            email: "chvsneha2310@gmail.com" 
        },
        accent: "accent-red-light"
    }
];

// Helper for Brand Icons
const BrandIcon = ({ type }) => {
    if (type === 'github') return <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
    if (type === 'linkedin') return <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
    if (type === 'twitter') return <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    return null;
}
const About = () => {
    const { hash } = useLocation();

    useEffect(() => {
        if (hash) {
            const id = hash.replace("#", "");
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 100);
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [hash]);

    return (
        <div className="about-page">
            <div className="about-container mt-20">

                {/* ── MISSION SECTION ─────────────────────────────────── */}
                <section id="about" className="about-section mission-section">
                    <RevealOnScroll className="fade-in">
                        <h1 className="about-headline">
                            Accelerating the Scale of <span className="text-red">Justice</span>.
                        </h1>
                    </RevealOnScroll>
                </section>

                {/* ── TEAM SECTION ───────────────────────────────────── */}
                <section id="team" className="about-section team-section">
                    <RevealOnScroll className="fade-in">
                        <div className="text-center-box">
                            <h2 className="section-title">Meet the Architects</h2>
                            <p className="section-desc">The engineers building the future of digital jurisprudence.</p>
                        </div>
                    </RevealOnScroll>

                    <div className="team-grid">
                        {team.map((member, index) => (
                            <RevealOnScroll key={index} className="fade-in" delay={index * 200}>
                                <article className="team-card">
                                    <div className="avatar-wrapper">
                                        <div className={cn("avatar-container", member.accent)}>
                                            <img src={member.avatar} alt={member.name} />
                                        </div>
                                    </div>

                                    <h3 className="member-name">{member.name}</h3>
                                    <p className="member-role">{member.role}</p>

                                    <div className="social-links">
                                        <a href={member.socials.github} target="_blank" rel="noopener noreferrer" className="brand-link"><BrandIcon type="github" /></a>
                                        <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer" className="brand-link"><BrandIcon type="linkedin" /></a>
                                        <a href={member.socials.portfolio} target="_blank" rel="noopener noreferrer"><Globe size={20} /></a>
                                        <a href={member.socials.twitter} target="_blank" rel="noopener noreferrer" className="brand-link"><BrandIcon type="twitter" /></a>
                                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${member.socials.email}`} target="_blank" rel="noopener noreferrer"><Mail size={20} /></a>
                                    </div>
                                </article>
                            </RevealOnScroll>
                        ))}
                    </div>
                </section>



            </div>
        </div>
    );
};

export default About;
