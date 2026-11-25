use std::fs;
use std::path::Path;

#[derive(Clone, Debug)]
pub struct BotReply {
    pub text: String,
    pub is_interactive_menu: bool,
    pub header: Option<String>,
    pub buttons: Vec<(String, String)>, // (id, title)
}

#[derive(Clone, Debug)]
pub struct FaqEngine {
    pub knowledge_dir: String,
    pub fallback_reply: String,
}

impl FaqEngine {
    pub fn new(knowledge_dir: &str) -> Self {
        Self {
            knowledge_dir: knowledge_dir.to_string(),
            fallback_reply: "Thanks for reaching out to RadialCode! Our team has received your message and an agent will reply shortly.\n\nYou can also reach us directly:\n📞 Phone: +91 97157 11119\n📧 Email: contact@radialcode.com\n🌐 Website: https://www.radialcode.com".to_string(),
        }
    }

    /// Read all markdown files dynamically from the knowledge directory
    pub fn get_knowledge_summary(&self) -> String {
        let mut full_text = String::new();
        let path = Path::new(&self.knowledge_dir);
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_file() && entry_path.extension().map_or(false, |ext| ext == "md") {
                    if let (Some(filename), Ok(content)) = (entry_path.file_name().and_then(|f| f.to_str()), fs::read_to_string(&entry_path)) {
                        full_text.push_str(&format!("\n--- {} ---\n{}\n", filename, content.trim()));
                    }
                }
            }
        }
        if full_text.is_empty() {
            "No knowledge files found in directory.".to_string()
        } else {
            full_text
        }
    }

    /// Match customer inquiry against FAQ / Services / Courses / Team / Contact knowledge
    pub fn answer_query(&self, query: &str) -> BotReply {
        let q = query.trim().to_lowercase();

        // 1. GREETINGS & MENU TRIGGER -> Send Interactive Buttons (HDFC style)
        if q == "hi"
            || q == "hello"
            || q == "hey"
            || q == "start"
            || q == "menu"
            || q == "help"
            || q == "options"
            || q.starts_with("hi ")
            || q.starts_with("hello ")
            || q.starts_with("hey ")
        {
            return BotReply {
                header: Some("RadialCode Support".to_string()),
                text: "Hello! Welcome to RadialCode 👋\nWe specialize in Custom Web & App Development, UI/UX Design, and Professional Tech Training.\n\nPlease select an option below or type your question:\n1️⃣ Reply *1* or *Services* - Web & Software Services\n2️⃣ Reply *2* or *Courses* - Training & Certifications\n3️⃣ Reply *3* or *Contact* - Phone, Email & Address\n4️⃣ Reply *4* or *Careers* - Job Openings & Hiring".to_string(),
                is_interactive_menu: true,
                buttons: vec![
                    ("btn_services".to_string(), "🛠 Services".to_string()),
                    ("btn_courses".to_string(), "🎓 Courses".to_string()),
                    ("btn_contact".to_string(), "📞 Contact".to_string()),
                ],
            };
        }

        // 2. SERVICES & DEVELOPMENT
        if q == "btn_services"
            || q.contains("service")
            || q.contains("offer")
            || q.contains("what do you do")
            || q.contains("software")
            || q.contains("web app")
            || q.contains("website")
            || q.contains("development")
            || q.contains("devops")
            || q.contains("wordpress")
            || q.contains("shopify")
        {
            return BotReply {
                header: None,
                text: "🛠 *RadialCode Core Services:*\n\n1. *Custom Web & App Development* (React, Next.js, Node.js, Rust, Python)\n2. *UI/UX Strategy & Product Design* (Figma prototypes, design systems)\n3. *Enterprise CMS & E-Commerce* (Custom WordPress, WooCommerce, Headless, Shopify)\n4. *Staff Augmentation & Dedicated Remote Teams*\n5. *Cloud Infrastructure & DevOps* (AWS, GCP, Docker, CI/CD)\n6. *24/7 Website Maintenance & SLA Support*\n\n🌐 Explore our services: https://www.radialcode.com/services\n💬 Reply here to discuss your project requirements!".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }

        // 3. COURSES & LEARNING (RadialCode Learn)
        if q == "btn_courses"
            || q.contains("course")
            || q.contains("learn")
            || q.contains("training")
            || q.contains("class")
            || q.contains("study")
            || q.contains("syllabus")
            || q.contains("full stack")
            || q.contains("react course")
            || q.contains("ui ux course")
            || q.contains("certificate")
        {
            return BotReply {
                header: None,
                text: "🎓 *RadialCode Learning Programs (RadialCode Learn):*\n\n1. *Full-Stack Web Development* (HTML, CSS, JS, React, Node, Express, MongoDB)\n2. *Frontend Engineering & React Mastery* (React, Next.js, TailwindCSS)\n3. *UI/UX Design Masterclass* (Figma, Design Systems, UX Research)\n4. *WordPress & Headless CMS Development*\n5. *Backend & API Engineering*\n\n✨ *Key Highlights:* Live mentor-led sessions, 1-on-1 doubt clearing, capstone projects, placement assistance & certification!\n\n🌐 View Courses & Enroll: https://learn.radialcode.com/courses".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }

        // 4. CONTACT US & LOCATION
        if q == "btn_contact"
            || q.contains("contact")
            || q.contains("phone")
            || q.contains("number")
            || q.contains("email")
            || q.contains("address")
            || q.contains("location")
            || q.contains("office")
            || q.contains("call")
            || q.contains("where are you")
        {
            return BotReply {
                header: None,
                text: "📞 *Contact RadialCode:*\n\n- *Phone / WhatsApp:* +91 97157 11119\n- *Email:* contact@radialcode.com / sales@radialcode.com\n- *Office Location:* Hisar, Haryana, India - 125001\n- *Working Hours:* Monday to Friday: 9:30 AM – 6:30 PM IST\n\n📅 Book a direct consultation call: https://www.radialcode.com/request-call".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }

        // 5. TEAM & LEADERSHIP
        if q.contains("team")
            || q.contains("founder")
            || q.contains("ceo")
            || q.contains("coo")
            || q.contains("who are you")
            || q.contains("jeet")
            || q.contains("sumit")
            || q.contains("developer")
            || q.contains("engineer")
        {
            return BotReply {
                header: None,
                text: "👥 *RadialCode Leadership & Team:*\n\n- *Jeet B. (Beniwal)* – Chief Operating Officer (COO)\n- *Sumit S. (Sharma)* – Software Engineer & Solutions Architect\n- *Amit S. (Sharma)* – Solutions Consultant & Client Management\n- *Ravi S.* – Lead CMS Developer & WordPress Specialist\n- *Pawan C.* – Operations Manager\n...backed by our passionate team of full-stack engineers and UI/UX designers!\n\n🌐 Meet our full team: https://www.radialcode.com/team".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }


        // 6. CAREERS & HIRING
        if q == "btn_careers"
            || q == "4"
            || q.contains("career")
            || q.contains("job")
            || q.contains("hiring")
            || q.contains("internship")
            || q.contains("vacancy")
            || q.contains("opening")
            || q.contains("apply")
            || q.contains("work with you")
        {
            return BotReply {
                header: None,
                text: "💼 *Careers at RadialCode:*\n\nWe are actively looking for passionate builders!\n\n*Typical Open Positions:*\n• *Frontend Developer:* React, Next.js, TailwindCSS\n• *Backend Developer:* Node.js, Python, Rust, APIs\n• *WordPress / Full-Stack:* Custom themes & Headless CMS\n• *UI/UX Designer:* Figma, design systems, wireframes\n• *Technical Interns:* Frontend & Backend development\n\n✨ *Perks:* Remote & hybrid flexibility, continuous learning, and top gear.\n\n📧 *Send CV/Portfolio to:* contact@radialcode.com\n🌐 *Apply Online:* https://www.radialcode.com/careers\n📝 *Subject Format:* Job Application - [Your Role]".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }

        // 7. PORTFOLIO & WORK
        if q.contains("portfolio")
            || q.contains("project")
            || q.contains("work")
            || q.contains("case study")
            || q.contains("client")
            || q.contains("experience")
        {
            return BotReply {
                header: None,
                text: "🏆 *RadialCode Track Record & Portfolio:*\n\n- 100+ Projects Delivered Worldwide\n- 98% Client Satisfaction Rate (USA, UK, Europe, Australia, India)\n- Featured Work in FinTech platforms, Global Headless E-Commerce, Healthcare SaaS, and EdTech portals.\n\n🌐 View our case studies: https://www.radialcode.com/portfolio".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }

        // 8. WORKING HOURS
        if q.contains("hour")
            || q.contains("timing")
            || q.contains("time")
            || q.contains("when are you open")
        {
            return BotReply {
                header: None,
                text: "⏰ *RadialCode Business Hours:*\n- Monday to Friday: 9:30 AM – 6:30 PM IST\n- Saturday & Sunday: Support on appointment / Enterprise SLA response\n\nCall/WhatsApp: +91 97157 11119\nEmail: contact@radialcode.com".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }

        // 9. PRICING & QUOTES
        if q.contains("price")
            || q.contains("pricing")
            || q.contains("cost")
            || q.contains("quote")
            || q.contains("estimate")
            || q.contains("rate")
        {
            return BotReply {
                header: None,
                text: "💰 *Project Estimates & Pricing:*\n\nEvery project is tailored to specific feature requirements, timeline, and tech stack.\n\nPlease share a brief summary of what you are looking to build, and our solutions team will provide a transparent estimate within 24 business hours!\n\nDirect Inquiry: https://www.radialcode.com/contact-us\nSales: sales@radialcode.com".to_string(),
                is_interactive_menu: false,
                buttons: vec![],
            };
        }

        // 10. FALLBACK
        BotReply {
            header: None,
            text: self.fallback_reply.clone(),
            is_interactive_menu: false,
            buttons: vec![],
        }
    }
}
