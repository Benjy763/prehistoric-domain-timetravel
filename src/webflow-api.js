/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Intégration avec Webflow CMS API
 */

class WebflowAPI {
    constructor(apiKey, collectionId) {
        this.apiKey = apiKey;
        this.collectionId = collectionId;
        this.baseUrl = 'https://api.webflow.com';
        this.contents = [];
    }

    async fetchContents() {
        // TODO: Implémenter l'appel à l'API Webflow
        // Pour l'instant, retourner des données de test
        
        console.log('Fetching contents from Webflow CMS...');
        
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Données de test
        this.contents = this.getMockData();
        
        return this.contents;
    }

    getMockData() {
        return [
            {
                id: '1',
                title: 'T-REX HUNT - Gobi Desert',
                description: 'Découverte d\'un T-Rex dans le désert de Gobi durant la période du Crétacé supérieur.',
                artist: 'John Doe',
                period: 'cretaceous',
                periodLabel: 'Crétacé',
                type: 'videos',
                latitude: 43.5,
                longitude: 104.0,
                preview: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                pageUrl: 'https://prehistoricdomain.com/content/t-rex-hunt'
            },
            {
                id: '2',
                title: 'Stegosaurus - Amérique du Nord',
                description: 'Illustration d\'un Stegosaurus durant le Jurassique supérieur en Amérique du Nord.',
                artist: 'Jane Smith',
                period: 'jurassic',
                periodLabel: 'Jurassique',
                type: 'images',
                latitude: 39.0,
                longitude: -105.5,
                preview: 'https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Stegosaurus',
                pageUrl: 'https://prehistoricdomain.com/content/stegosaurus'
            },
            {
                id: '3',
                title: 'Forêt du Carbonifère',
                description: 'Immersion 3D dans une forêt tropicale du Carbonifère avec des fougères géantes.',
                artist: 'Mike Johnson',
                period: 'permian',
                periodLabel: 'Permien',
                type: '3d',
                latitude: 51.5,
                longitude: -0.1,
                preview: 'https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Carboniferous+Forest',
                pageUrl: 'https://prehistoricdomain.com/content/carboniferous-forest'
            },
            {
                id: '4',
                title: 'Plateosaurus - Allemagne',
                description: 'Vidéo documentaire sur le Plateosaurus, un des premiers grands dinosaures herbivores.',
                artist: 'Sarah Williams',
                period: 'triassic',
                periodLabel: 'Trias',
                type: 'videos',
                latitude: 48.8,
                longitude: 9.2,
                preview: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                pageUrl: 'https://prehistoricdomain.com/content/plateosaurus'
            },
            {
                id: '5',
                title: 'Diplodocus - Wyoming',
                description: 'Reconstitution artistique d\'un troupeau de Diplodocus au Jurassique.',
                artist: 'Robert Brown',
                period: 'jurassic',
                periodLabel: 'Jurassique',
                type: 'images',
                latitude: 43.0,
                longitude: -107.5,
                preview: 'https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Diplodocus',
                pageUrl: 'https://prehistoricdomain.com/content/diplodocus'
            },
            {
                id: '6',
                title: 'Tricératops - Montana',
                description: 'Exploration 3D interactive d\'un site de fouilles de Tricératops.',
                artist: 'Emily Davis',
                period: 'cretaceous',
                periodLabel: 'Crétacé',
                type: '3d',
                latitude: 46.8,
                longitude: -110.4,
                preview: 'https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Triceratops',
                pageUrl: 'https://prehistoricdomain.com/content/triceratops'
            }
        ];
    }

    filterByPeriod(period) {
        return this.contents.filter(content => content.period === period);
    }

    filterByType(types) {
        if (!types || types.length === 0) return this.contents;
        return this.contents.filter(content => types.includes(content.type));
    }

    filterByPeriodAndType(period, types) {
        return this.contents.filter(content => 
            content.period === period && types.includes(content.type)
        );
    }
}
