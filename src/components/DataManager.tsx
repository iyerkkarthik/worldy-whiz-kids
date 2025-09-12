import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, Download } from "lucide-react";

const DataManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState<{ countries: number; pois: number } | null>(null);
  const { toast } = useToast();

  const fetchCounts = async () => {
    try {
      const [countriesResult, poisResult] = await Promise.all([
        supabase.from('countries').select('*', { count: 'exact', head: true }),
        supabase.from('points_of_interest').select('*', { count: 'exact', head: true })
      ]);

      setCounts({
        countries: countriesResult.count || 0,
        pois: poisResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const handlePopulateData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-countries');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Success! 🌍",
        description: `Countries and landmarks have been updated in the database.`,
      });

      // Refresh counts after successful population
      await fetchCounts();
    } catch (error) {
      console.error('Error populating data:', error);
      toast({
        title: "Error",
        description: "Failed to update the database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial counts when component mounts
  React.useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Database className="h-5 w-5" />
          Data Management
        </CardTitle>
        <CardDescription>
          Update countries and landmarks database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {counts && (
          <div className="bg-accent/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span>Countries:</span>
              <span className="font-medium">{counts.countries}</span>
            </div>
            <div className="flex justify-between">
              <span>Landmarks:</span>
              <span className="font-medium">{counts.pois}</span>
            </div>
          </div>
        )}
        
        <Button
          onClick={handlePopulateData}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Database...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Refresh Countries Data
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          This will fetch the latest country information and landmarks from external APIs.
        </p>
      </CardContent>
    </Card>
  );
};

export default DataManager;