import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Search } from "lucide-react";

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const WEST_AFRICAN_COUNTRIES: Country[] = [
  { code: "BJ", name: "Bénin", dialCode: "+229", flag: "🇧🇯" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
  { code: "CV", name: "Cap-Vert", dialCode: "+238", flag: "🇨🇻" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
  { code: "GM", name: "Gambie", dialCode: "+220", flag: "🇬🇲" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "GN", name: "Guinée", dialCode: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guinée-Bissau", dialCode: "+245", flag: "🇬🇼" },
  { code: "LR", name: "Liberia", dialCode: "+231", flag: "🇱🇷" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "SN", name: "Sénégal", dialCode: "+221", flag: "🇸🇳" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", flag: "🇸🇱" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
];

interface CountryPhoneSelectorProps {
  selectedCountry: Country | null;
  phone: string;
  onCountryChange: (country: Country) => void;
  onPhoneChange: (phone: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function CountryPhoneSelector({
  selectedCountry,
  phone,
  onCountryChange,
  onPhoneChange,
  label = "Numéro de téléphone",
  placeholder = "XX XX XX XX",
  required = false,
}: CountryPhoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredCountries = WEST_AFRICAN_COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountrySelect = (country: Country) => {
    onCountryChange(country);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        {/* Country Code Selector */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-32 justify-start gap-2 px-2"
              type="button"
            >
              {selectedCountry ? (
                <>
                  <span className="text-xl">{selectedCountry.flag}</span>
                  <span className="text-xs">{selectedCountry.dialCode}</span>
                </>
              ) : (
                <span className="text-sm">Pays</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-2">
            {/* Search input */}
            <div className="mb-2 flex items-center gap-2 px-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Chercher un pays..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            {/* Countries list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <DropdownMenuItem
                    key={country.code}
                    onClick={() => handleCountrySelect(country)}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{country.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {country.dialCode}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                  Aucun pays trouvé
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Phone Number Input */}
        <Input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {selectedCountry
          ? `Indice: ${selectedCountry.dialCode}`
          : "Sélectionnez un pays"}
      </p>
    </div>
  );
}

export { WEST_AFRICAN_COUNTRIES };
export type { Country };
