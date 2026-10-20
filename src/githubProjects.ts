export type DeploymentService = {
  name: string;
  url: string;
  type: string;
  branch: string | null;
  serviceId: string | null;
  suspended: string;
};

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
  deploymentServices?: DeploymentService[];
};

// Inventory refreshed from GitHub repositories visible to the connected account and the Render workspace on 2026-10-20.
// Configured URLs are not uptime checks. The scheduled sync workflow refreshes this generated snapshot.
export const githubProjects: GitHubProject[] = [
  {
    "name": "Arc-Africa-",
    "repoUrl": "https://github.com/jark-zenith/Arc-Africa-",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://arc-africa-recruitment.onrender.com",
    "deploymentName": "arc-africa-recruitment",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "arc-africa-recruitment",
        "url": "https://arc-africa-recruitment.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dbai28nbtjjs73f8de30",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "davine-cherotich-portfolio",
        "url": "https://davine-cherotich-portfolio.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db6836g473hc73dgdrv0",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "deon-dev",
        "url": "https://deon-dev.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db5nt84s728c738f6lfg",
        "suspended": "not_suspended"
      }
    ]
  },
  {
    "name": "Ichat",
    "repoUrl": "https://github.com/jark-zenith/Ichat",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://ichat-1oyf.onrender.com",
    "deploymentName": "ichat",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "ichat",
        "url": "https://ichat-1oyf.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dav7q1u0tbcc73e1qdig",
        "suspended": "not_suspended"
      },
      {
        "name": "Ichat-App",
        "url": "https://ichat-api-11v6.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-davb605g1s2s739r26f0",
        "suspended": "not_suspended"
      }
    ]
  },
  {
    "name": "Ivy-mark-2",
    "repoUrl": "https://github.com/jark-zenith/Ivy-mark-2",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://ivy-mark-2.onrender.com",
    "deploymentName": "ivy-mark-2",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "ivy-mark-2",
        "url": "https://ivy-mark-2.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db1n8qjtqb8s73dtcd10",
        "suspended": "not_suspended"
      },
      {
        "name": "ivy-mark-2-web",
        "url": "https://ivy-mark-2-web.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db1o3degekts73eoc1l0",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "jark-personal-ai",
        "url": "https://jark-personal-ai.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-db9hf8vbtjjs73bo5ih0",
        "suspended": "not_suspended"
      }
    ]
  },
  {
    "name": "MovieMax",
    "repoUrl": "https://github.com/jark-zenith/MovieMax",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://moviemax-h1sf.onrender.com",
    "deploymentName": "moviemax",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "moviemax",
        "url": "https://moviemax-h1sf.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dbb7dpgu01pc73djr4ig",
        "suspended": "not_suspended"
      },
      {
        "name": "moviemax-kenya",
        "url": "https://moviemax-kenya.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dbb3je4s728c73a9hpb0",
        "suspended": "not_suspended"
      },
      {
        "name": "moviemax-api",
        "url": "https://moviemax-api.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-dbb7dlvf3r2c73e47s70",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "order-up",
        "url": "https://order-up-w3zj.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dau3oemk1f9s73a7u6l0",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "pichahub-web",
        "url": "https://pichahub-web.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-db7lnlrbc2fs73flhtmg",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "pruden-ai-tech-industries",
        "url": "https://pruden-ai-tech-industries.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dau1if5g1s2s73b3ulf0",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "pruden-jack-gideon",
        "url": "https://pruden-jack-gideon.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db2vua7lk1mc738v60l0",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "pruden-technologies",
        "url": "https://pruden-technologies.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db9pb0tg1s2s739i8rj0",
        "suspended": "not_suspended"
      },
      {
        "name": "pruden-command-secure",
        "url": "https://pruden-command-secure.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-db9t1v3bc2fs73d4hpqg",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "phase-1-secure-core",
    "deploymentServices": [
      {
        "name": "rita-ai",
        "url": "https://rita-ai.onrender.com",
        "type": "web_service",
        "branch": "phase-1-secure-core",
        "serviceId": "srv-datq5th7lnhs73eb7k0g",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "sheila-njeri-kimani",
        "url": "https://sheila-njeri-kimani.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db6cju142hec73bo9bvg",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "pruden-study-tracker",
        "url": "https://pruden-study-tracker.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-davoe53ncjis73f5ifh0",
        "suspended": "not_suspended"
      }
    ]
  },
  {
    "name": "V.E.R.O.N.I.C.C.A",
    "repoUrl": "https://github.com/jark-zenith/V.E.R.O.N.I.C.C.A",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://veronicca-command.onrender.com",
    "deploymentName": "veronicca-command",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "veronicca-command",
        "url": "https://veronicca-command.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db2d5q6k1f9s73a1khog",
        "suspended": "not_suspended"
      },
      {
        "name": "veronicca-interface",
        "url": "https://veronicca-interface.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-db2ear67bikc73dfl49g",
        "suspended": "not_suspended"
      },
      {
        "name": "veronicca-interface-live",
        "url": "https://veronicca-interface-live.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-db2eipmi0phs73ed8qd0",
        "suspended": "not_suspended"
      }
    ]
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
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
    "deploymentBranch": null,
    "deploymentServices": []
  }
];
