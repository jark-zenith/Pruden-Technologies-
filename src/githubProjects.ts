export type GitHubProject = {
  name: string;
  repoUrl: string;
  visibility: string;
  archived: boolean;
  defaultBranch: string;
  deploymentUrl: string | null;
  deploymentName: string | null;
  deploymentType: string | null;
  deploymentBranch: string | null;
};

// Snapshot of repositories visible to the connected GitHub account at implementation time.
// Deployment URLs are drawn from the connected Render workspace; they indicate a configured URL,
// not a real-time uptime check. Refresh this data when adding repositories or deployments.
export const githubProjects: GitHubProject[] = [
  {
    "name": "Arc Africa",
    "repoUrl": "https://github.com/jark-zenith/Arc-Africa-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://arc-africa-recruitment.onrender.com",
    "deploymentName": "arc-africa-recruitment",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "jark-ai-tech-labs",
    "repoUrl": "https://github.com/jark-zenith/jark-ai-tech-labs",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "J.A.R.K--TODO-",
    "repoUrl": "https://github.com/jark-zenith/J.A.R.K--TODO-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "jark-zenith",
    "repoUrl": "https://github.com/jark-zenith/jark-zenith",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Pruden-Network",
    "repoUrl": "https://github.com/jark-zenith/Pruden-Network",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "J.A.R.V.I.S",
    "repoUrl": "https://github.com/jark-zenith/J.A.R.V.I.S",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "F.R.I.D.A.Y-",
    "repoUrl": "https://github.com/jark-zenith/F.R.I.D.A.Y-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "KAREN",
    "repoUrl": "https://github.com/jark-zenith/KAREN",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "JARKBook",
    "repoUrl": "https://github.com/jark-zenith/JARKBook",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Jark-Invoice",
    "repoUrl": "https://github.com/jark-zenith/Jark-Invoice",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "jark-edu",
    "repoUrl": "https://github.com/jark-zenith/jark-edu",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "jark-property",
    "repoUrl": "https://github.com/jark-zenith/jark-property",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "jark-order",
    "repoUrl": "https://github.com/jark-zenith/jark-order",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "JARK-resume-",
    "repoUrl": "https://github.com/jark-zenith/JARK-resume-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "JARK-Market-",
    "repoUrl": "https://github.com/jark-zenith/JARK-Market-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "jark-jobs",
    "repoUrl": "https://github.com/jark-zenith/jark-jobs",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Itech-Academy-",
    "repoUrl": "https://github.com/jark-zenith/Itech-Academy-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "firelily-events-intelligence",
    "repoUrl": "https://github.com/jark-zenith/firelily-events-intelligence",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "J.A.R.K-AI",
    "repoUrl": "https://github.com/jark-zenith/J.A.R.K-AI",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "J.A.R.K-OS",
    "repoUrl": "https://github.com/jark-zenith/J.A.R.K-OS",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Pruden-Jack-Gideon",
    "repoUrl": "https://github.com/jark-zenith/Pruden-Jack-Gideon",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://pruden-jack-gideon.onrender.com",
    "deploymentName": "pruden-jack-gideon",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "Atlas-CRM",
    "repoUrl": "https://github.com/jark-zenith/Atlas-CRM",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "AUTODOC",
    "repoUrl": "https://github.com/jark-zenith/AUTODOC",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "PRUDEN-AI",
    "repoUrl": "https://github.com/jark-zenith/PRUDEN-AI",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Deon-1.0",
    "repoUrl": "https://github.com/jark-zenith/Deon-1.0",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Deon-Len-1-",
    "repoUrl": "https://github.com/jark-zenith/Deon-Len-1-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Order-Up",
    "repoUrl": "https://github.com/jark-zenith/Order-Up",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://order-up-w3zj.onrender.com",
    "deploymentName": "order-up",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "PRUDEN-DYNASTY-",
    "repoUrl": "https://github.com/jark-zenith/PRUDEN-DYNASTY-",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "pruden-studios",
    "repoUrl": "https://github.com/jark-zenith/pruden-studios",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "R.I.T.A-AI",
    "repoUrl": "https://github.com/jark-zenith/R.I.T.A-AI",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://rita-ai.onrender.com",
    "deploymentName": "rita-ai",
    "deploymentType": "web_service",
    "deploymentBranch": "phase-1-secure-core"
  },
  {
    "name": "PRUDEN-AI-TECH-INDUSTRIES-",
    "repoUrl": "https://github.com/jark-zenith/PRUDEN-AI-TECH-INDUSTRIES-",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://pruden-ai-tech-industries.onrender.com",
    "deploymentName": "pruden-ai-tech-industries",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "Ichat",
    "repoUrl": "https://github.com/jark-zenith/Ichat",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://ichat-api-11v6.onrender.com",
    "deploymentName": "Ichat-App",
    "deploymentType": "web_service",
    "deploymentBranch": "main"
  },
  {
    "name": "study-tracker",
    "repoUrl": "https://github.com/jark-zenith/study-tracker",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://pruden-study-tracker.onrender.com",
    "deploymentName": "pruden-study-tracker",
    "deploymentType": "web_service",
    "deploymentBranch": "main"
  },
  {
    "name": "Trucker-Buddy",
    "repoUrl": "https://github.com/jark-zenith/Trucker-Buddy",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "deon-6-model",
    "repoUrl": "https://github.com/jark-zenith/deon-6-model",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Ivy-",
    "repoUrl": "https://github.com/jark-zenith/Ivy-",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Ivy-mark-2",
    "repoUrl": "https://github.com/jark-zenith/Ivy-mark-2",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://ivy-mark-2-web.onrender.com",
    "deploymentName": "ivy-mark-2-web",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "Platform-Deon-AI",
    "repoUrl": "https://github.com/jark-zenith/Platform-Deon-AI",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "ivy-assistant",
    "repoUrl": "https://github.com/jark-zenith/ivy-assistant",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "V.E.R.O.N.I.C.C.A",
    "repoUrl": "https://github.com/jark-zenith/V.E.R.O.N.I.C.C.A",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://veronicca-interface-live.onrender.com",
    "deploymentName": "veronicca-interface-live",
    "deploymentType": "web_service",
    "deploymentBranch": "main"
  },
  {
    "name": "Gideon-SI-",
    "repoUrl": "https://github.com/jark-zenith/Gideon-SI-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "app-1",
    "repoUrl": "https://github.com/jark-zenith/app-1",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "gideon-si",
    "repoUrl": "https://github.com/jark-zenith/gideon-si",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "SI-Gideon-",
    "repoUrl": "https://github.com/jark-zenith/SI-Gideon-",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "LexisAi",
    "repoUrl": "https://github.com/jark-zenith/LexisAi",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Davine-Cherotich",
    "repoUrl": "https://github.com/jark-zenith/Davine-Cherotich",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://davine-cherotich-portfolio.onrender.com",
    "deploymentName": "davine-cherotich-portfolio",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "BLOXFORT-TAIMOS",
    "repoUrl": "https://github.com/jark-zenith/BLOXFORT-TAIMOS",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Deon-dev",
    "repoUrl": "https://github.com/jark-zenith/Deon-dev",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://deon-dev.onrender.com",
    "deploymentName": "deon-dev",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "Sheila-Njeri-Kimani-",
    "repoUrl": "https://github.com/jark-zenith/Sheila-Njeri-Kimani-",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://sheila-njeri-kimani.onrender.com",
    "deploymentName": "sheila-njeri-kimani",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "Deon.dev-v2-",
    "repoUrl": "https://github.com/jark-zenith/Deon.dev-v2-",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "Aurora-SI",
    "repoUrl": "https://github.com/jark-zenith/Aurora-SI",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "portfolio",
    "repoUrl": "https://github.com/jark-zenith/portfolio",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null
  },
  {
    "name": "PichaHub",
    "repoUrl": "https://github.com/jark-zenith/PichaHub",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://pichahub-web.onrender.com",
    "deploymentName": "pichahub-web",
    "deploymentType": "web_service",
    "deploymentBranch": "main"
  },
  {
    "name": "Pruden-Technologies-",
    "repoUrl": "https://github.com/jark-zenith/Pruden-Technologies-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://pruden-technologies.onrender.com",
    "deploymentName": "pruden-technologies",
    "deploymentType": "static_site",
    "deploymentBranch": "main"
  },
  {
    "name": "J.A.R.K-",
    "repoUrl": "https://github.com/jark-zenith/J.A.R.K-",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://jark-personal-ai.onrender.com",
    "deploymentName": "jark-personal-ai",
    "deploymentType": "web_service",
    "deploymentBranch": "main"
  }
];
