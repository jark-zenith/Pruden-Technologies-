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

// Generated from the connected GitHub owner account and Render workspace.
// URLs are configured deployments, not an uptime guarantee. Do not hand-edit; run the sync workflow.
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
