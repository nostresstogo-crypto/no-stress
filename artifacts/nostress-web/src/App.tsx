import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "components/ui/toaster";
import { TooltipProvider } from "components/ui/tooltip";
import { LanguageProvider } from "lib/i18n";
import { translations } from "lib/translations";
import NotFound from "pages/not-found";

import Home from "pages/Home";
import Privacy from "pages/Privacy";
import AccountDeletion from "pages/AccountDeletion";
import TermsOfUse from "pages/TermsOfUse";
import Contact from "pages/Contact";
import TesterFeedback from "pages/TesterFeedback";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/conditions-utilisation" component={TermsOfUse} />
      <Route path="/politique-confidentialite" component={Privacy} />
      <Route path="/suppression-compte" component={AccountDeletion} />
      <Route path="/contact" component={Contact} />
      <Route path="/beta-feedback" component={TesterFeedback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider translations={translations}>
          <WouterRouter base={(process.env.PUBLIC_URL || "").replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
