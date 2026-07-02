/**
 * Curated board templates (Trello-style). Each has a set of lists that follow
 * the accepted workflow for that use case, an optional label palette, and a
 * background. Consumed by the seed script and the in-app template gallery.
 *
 * Workflow logic (researched from common Trello/Jira board templates):
 *  - Simple Kanban:      To Do → Doing → Done
 *  - Project Management: Backlog → To Do → In Progress → Review → Done
 *  - Agile Sprint:       Product Backlog → Sprint Backlog → In Progress → In Review → Done
 *  - Content Calendar:   Ideas → Writing → Editing → Scheduled → Published
 *  - Web Design:         Requests → Research → Design → Review → Delivered
 *  - Bug Tracking:       Reported → Confirmed → In Progress → Fixed → Verified
 *  - Go-To-Market:       Research → Planning → Execution → Launched
 *  - Weekly Planning:    Backlog → This Week → Today → Doing → Done
 */
export interface BoardTemplateSeed {
  name: string;
  description: string;
  payload: {
    lists: string[];
    labels?: { name: string; color: string }[];
    background?: string;
  };
}

const L = {
  green: "#61BD4F",
  yellow: "#F2D600",
  orange: "#FF9F1A",
  red: "#EB5A46",
  purple: "#C377E0",
  blue: "#0079BF",
  sky: "#00C2E0",
  pink: "#FF78CB",
};

export const BOARD_TEMPLATES: BoardTemplateSeed[] = [
  {
    name: "Simple Kanban",
    description: "The classic three-column flow — great for anything.",
    payload: {
      lists: ["To Do", "Doing", "Done"],
      labels: [
        { name: "Priority", color: L.red },
        { name: "Quick win", color: L.green },
      ],
      background: "photo:ph-05",
    },
  },
  {
    name: "Project Management",
    description: "Plan, track and ship a project end to end.",
    payload: {
      lists: ["Backlog", "To Do", "In Progress", "Review", "Done"],
      labels: [
        { name: "High", color: L.red },
        { name: "Medium", color: L.orange },
        { name: "Low", color: L.green },
        { name: "Blocked", color: L.purple },
      ],
      background: "photo:ph-12",
    },
  },
  {
    name: "Agile Sprint",
    description: "Scrum sprint board: backlog to shipped increment.",
    payload: {
      lists: ["Product Backlog", "Sprint Backlog", "In Progress", "In Review", "Done"],
      labels: [
        { name: "Story", color: L.blue },
        { name: "Bug", color: L.red },
        { name: "Task", color: L.sky },
        { name: "Spike", color: L.purple },
      ],
      background: "photo:ph-08",
    },
  },
  {
    name: "Content Calendar",
    description: "Take content from idea to published.",
    payload: {
      lists: ["Ideas", "Writing", "Editing", "Scheduled", "Published"],
      labels: [
        { name: "Blog", color: L.blue },
        { name: "Social", color: L.pink },
        { name: "Newsletter", color: L.orange },
      ],
      background: "photo:ph-03",
    },
  },
  {
    name: "Web Design Process",
    description: "Move design work from request to delivery.",
    payload: {
      lists: ["Requests", "Research", "Design", "Review", "Delivered"],
      labels: [
        { name: "UX", color: L.purple },
        { name: "UI", color: L.pink },
        { name: "Urgent", color: L.red },
      ],
      background: "photo:ph-06",
    },
  },
  {
    name: "Bug Tracking",
    description: "Triage and squash bugs with confidence.",
    payload: {
      lists: ["Reported", "Confirmed", "In Progress", "Fixed", "Verified"],
      labels: [
        { name: "Critical", color: L.red },
        { name: "Major", color: L.orange },
        { name: "Minor", color: L.yellow },
      ],
      background: "photo:ph-09",
    },
  },
  {
    name: "Go-To-Market",
    description: "Coordinate a launch from research to live.",
    payload: {
      lists: ["Research", "Planning", "Execution", "Launched"],
      labels: [
        { name: "Marketing", color: L.pink },
        { name: "Product", color: L.blue },
        { name: "Sales", color: L.green },
      ],
      background: "photo:ph-14",
    },
  },
  {
    name: "Weekly Planning",
    description: "Focus your week: this week, today, done.",
    payload: {
      lists: ["Backlog", "This Week", "Today", "Doing", "Done"],
      labels: [
        { name: "Work", color: L.blue },
        { name: "Personal", color: L.green },
      ],
      background: "photo:ph-01",
    },
  },
];
