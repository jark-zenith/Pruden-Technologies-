export type DeploymentService = {
  name: string; url: string; type: string; branch: string | null; serviceId: string | null; suspended: string;
};

export type GitHubProject = {
  name: string; repoUrl: string; visibility: string; archived: boolean; defaultBranch: string;
  deploymentUrl: string | null; deploymentName: string | null; deploymentType: string | null; deploymentBranch: string | null; deploymentServices?: DeploymentService[];
};

// Provider inventory snapshot: connected GitHub owner account and Render workspace.
// External homepage URLs are shown separately from Render services; configured URLs are not an uptime guarantee.
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
    "name": "Atlas-CRM",
    "repoUrl": "https://github.com/jark-zenith/Atlas-CRM",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://atlas-crm-flame.vercel.app",
    "deploymentName": "External deployment",
    "deploymentType": "external",
    "deploymentBranch": null,
    "deploymentServices": [
      {
        "name": "External deployment",
        "url": "https://atlas-crm-flame.vercel.app",
        "type": "external",
        "branch": null,
        "serviceId": null,
        "suspended": "unknown"
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
    "deploymentUrl": "https://ichat-api-11v6.onrender.com",
    "deploymentName": "Ichat-App",
    "deploymentType": "web_service",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "Ichat-App",
        "url": "https://ichat-api-11v6.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-davb605g1s2s739r26f0",
        "suspended": "not_suspended"
      },
      {
        "name": "ichat",
        "url": "https://ichat-1oyf.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dav7q1u0tbcc73e1qdig",
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
    "name": "Nova-SI",
    "repoUrl": "https://github.com/jark-zenith/Nova-SI",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://nova-si-orb.onrender.com",
    "deploymentName": "nova-si-orb",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "nova-si-orb",
        "url": "https://nova-si-orb.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dbg7lcqjnfac73fgu550",
        "suspended": "not_suspended"
      },
      {
        "name": "nova-si",
        "url": "https://nova-si-4vsx.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dbg7el4ipgvc73eoe6q0",
        "suspended": "not_suspended"
      }
    ]
  },
  {
    "name": "Nyumba-Yetu",
    "repoUrl": "https://github.com/jark-zenith/Nyumba-Yetu",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://nyumba-yetu.onrender.com",
    "deploymentName": "nyumba-yetu",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "nyumba-yetu",
        "url": "https://nyumba-yetu.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dbea290ae00c73cev7u0",
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
    "name": "portfolio",
    "repoUrl": "https://github.com/jark-zenith/portfolio",
    "visibility": "public",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://portfolio-magicui.vercel.app",
    "deploymentName": "External deployment",
    "deploymentType": "external",
    "deploymentBranch": null,
    "deploymentServices": [
      {
        "name": "External deployment",
        "url": "https://portfolio-magicui.vercel.app",
        "type": "external",
        "branch": null,
        "serviceId": null,
        "suspended": "unknown"
      }
    ]
  },
  {
    "name": "Printroom",
    "repoUrl": "https://github.com/jark-zenith/Printroom",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://printroom.onrender.com",
    "deploymentName": "printroom",
    "deploymentType": "static_site",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "printroom",
        "url": "https://printroom.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-dbnjmbe7bikc73coa0u0",
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
    "deploymentUrl": "https://pruden-command-secure.onrender.com",
    "deploymentName": "pruden-command-secure",
    "deploymentType": "web_service",
    "deploymentBranch": "main",
    "deploymentServices": [
      {
        "name": "pruden-command-secure",
        "url": "https://pruden-command-secure.onrender.com",
        "type": "web_service",
        "branch": "main",
        "serviceId": "srv-db9t1v3bc2fs73d4hpqg",
        "suspended": "not_suspended"
      },
      {
        "name": "pruden-technologies",
        "url": "https://pruden-technologies.onrender.com",
        "type": "static_site",
        "branch": "main",
        "serviceId": "srv-db9pb0tg1s2s739i8rj0",
        "suspended": "not_suspended"
      }
    ]
  },
  {
    "name": "Pruden-Technologies-Website",
    "repoUrl": "https://github.com/jark-zenith/Pruden-Technologies-Website",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": "https://deon-labs.onrender.com",
    "deploymentName": "deon-labs",
    "deploymentType": "static_site",
    "deploymentBranch": "build/pruden-dashboard-foundation",
    "deploymentServices": [
      {
        "name": "deon-labs",
        "url": "https://deon-labs.onrender.com",
        "type": "static_site",
        "branch": "build/pruden-dashboard-foundation",
        "serviceId": "srv-dbkqqlc9v7es73f4d9h0",
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
    "name": "ai-teammate-browser",
    "repoUrl": "https://github.com/jark-zenith/ai-teammate-browser",
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
    "name": "Deon-OS",
    "repoUrl": "https://github.com/jark-zenith/Deon-OS",
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
    "name": "Deon-SI",
    "repoUrl": "https://github.com/jark-zenith/Deon-SI",
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
    "name": "E.D.I.T.H",
    "repoUrl": "https://github.com/jark-zenith/E.D.I.T.H",
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
    "name": "Ivy",
    "repoUrl": "https://github.com/jark-zenith/Ivy",
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
    "name": "J.A.R.K-",
    "repoUrl": "https://github.com/jark-zenith/J.A.R.K-",
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
    "name": "MyKiosk",
    "repoUrl": "https://github.com/jark-zenith/MyKiosk",
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
    "name": "NovaBase",
    "repoUrl": "https://github.com/jark-zenith/NovaBase",
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
    "name": "Order-Up",
    "repoUrl": "https://github.com/jark-zenith/Order-Up",
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
    "name": "PRUDEN-AI-TECH-INDUSTRIES-",
    "repoUrl": "https://github.com/jark-zenith/PRUDEN-AI-TECH-INDUSTRIES-",
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
    "name": "pruden-team-task-board",
    "repoUrl": "https://github.com/jark-zenith/pruden-team-task-board",
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
    "name": "R.I.T.A-AI",
    "repoUrl": "https://github.com/jark-zenith/R.I.T.A-AI",
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
    "name": "study-tracker",
    "repoUrl": "https://github.com/jark-zenith/study-tracker",
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
    "name": "teravex-ai",
    "repoUrl": "https://github.com/jark-zenith/teravex-ai",
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
    "name": "teravex-website",
    "repoUrl": "https://github.com/jark-zenith/teravex-website",
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
  },
  {
    "name": "V.E.R.O.N.I.C.C.A",
    "repoUrl": "https://github.com/jark-zenith/V.E.R.O.N.I.C.C.A",
    "visibility": "private",
    "archived": false,
    "defaultBranch": "main",
    "deploymentUrl": null,
    "deploymentName": null,
    "deploymentType": null,
    "deploymentBranch": null,
    "deploymentServices": []
  }
];
