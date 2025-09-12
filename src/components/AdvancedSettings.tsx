import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, AlertTriangle } from "lucide-react";
import DataManager from "./DataManager";

const AdvancedSettings = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent/50"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Advanced Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Settings
          </DialogTitle>
          <DialogDescription>
            Database management and administrative options
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Administrative Section</p>
                <p className="text-yellow-700 dark:text-yellow-300">These options are for data management and should be used carefully.</p>
              </div>
            </div>
          </div>
          
          <DataManager />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedSettings;