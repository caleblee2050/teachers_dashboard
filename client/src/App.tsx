import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import MyLibrary from "@/pages/my-library";
import AIContent from "@/pages/ai-content";
import StudentManagement from "@/pages/student-management";
import SharedContent from "@/pages/shared-content";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <div className="min-h-screen bg-gray-50">
            <AppHeader />
            <div className="flex h-screen pt-16">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/library" component={MyLibrary} />
                  <Route path="/ai-content" component={AIContent} />
                  <Route path="/students" component={StudentManagement} />
                  <Route path="/shared" component={SharedContent} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          </div>
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
