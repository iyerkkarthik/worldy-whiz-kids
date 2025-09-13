import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function DataRepopulator() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRepopulate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-countries', {
        body: {}
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "Data has been repopulated with fixed image URLs",
      });

      console.log('Repopulation result:', data);
    } catch (error) {
      console.error('Error repopulating data:', error);
      toast({
        title: "Error",
        description: "Failed to repopulate data. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="m-4">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4">Data Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Repopulate the database with fixed image URLs for Points of Interest.
        </p>
        <Button 
          onClick={handleRepopulate} 
          disabled={isLoading}
          variant="default"
        >
          {isLoading ? 'Repopulating...' : 'Repopulate Data'}
        </Button>
      </CardContent>
    </Card>
  );
}