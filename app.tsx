// bb-plugin-filetree — frontend.
//
// One thread-panel tab ("Files"): a preview pane on the left, a lazy file tree
// of the thread's environment directory on the right. Directories are read one
// level at a time, so a large repo costs nothing until it is expanded.
import { definePluginApp } from "@bb/plugin-sdk/app";
import { FileTreePanel } from "@/components/FileTreePanel";

export default definePluginApp((app) => {
  app.slots.threadPanelAction({
    id: "tree",
    title: "Files",
    icon: "Folder",
    layout: "flush",
    component: ({ threadId }) => <FileTreePanel threadId={threadId} />,
  });
});
