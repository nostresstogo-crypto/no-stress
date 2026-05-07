import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Partners from "@/pages/Partners";
import DeletionRequests from "@/pages/DeletionRequests";
import Publications from "@/pages/Publications";
import Venues from "@/pages/Venues";
import Statistics from "@/pages/Statistics";
import Profile from "@/pages/Profile";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { admin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  const { admin, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {!isLoading && admin ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/partenaires">
        <ProtectedRoute component={Partners} />
      </Route>
      <Route path="/publications">
        <ProtectedRoute component={Publications} />
      </Route>
      <Route path="/lieux">
        <ProtectedRoute component={Venues} />
      </Route>
      <Route path="/suppressions">
        <ProtectedRoute component={DeletionRequests} />
      </Route>
      <Route path="/statistiques">
        <ProtectedRoute component={Statistics} />
      </Route>
      <Route path="/profil">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/">
        {!isLoading && admin ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
