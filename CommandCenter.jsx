
import React, { useState, useEffect, useCallback } from 'react';
import { Catalog } from '@/api/entities';
import { FunnelProject } from '@/api/entities';
import { SalesPage } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import ImageUploader from '@/components/editor/ImageUploader';
import { toast } from 'sonner';
import { Save, RefreshCw, Eye, Loader2, Palette, Film, Image as ImageIcon, Sparkles, Dock, Footprints, MousePointerClick, PlusCircle, Copy } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ProjectSelector = ({ allProjects, visibleIds, onSelectionChange }) => {
    return (
        <div className="space-y-3">
            {allProjects.map(project => (
                <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                        id={`project-${project.id}`}
                        checked={visibleIds.includes(project.id)}
                        onCheckedChange={(checked) => {
                            const newVisibleIds = checked
                                ? [...visibleIds, project.id]
                                : visibleIds.filter(id => id !== project.id);
                            onSelectionChange(newVisibleIds);
                        }}
                    />
                    <label htmlFor={`project-${project.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {project.name}
                    </label>
                </div>
            ))}
            <p className="text-xs text-gray-500 pt-2">Se nenhuma campanha for selecionada, todas serão exibidas por padrão.</p>
        </div>
    );
};

const CreateCatalogModal = ({ isOpen, onOpenChange, onCatalogCreated }) => {
    const [name, setName] = useState('');
    const [purpose, setPurpose] = useState('general');

    const handleCreate = async () => {
        if (!name) {
            toast.error("O nome do catálogo é obrigatório.");
            return;
        }
        try {
            const newCatalog = await Catalog.create({ name, purpose });
            toast.success(`Catálogo "${name}" criado com sucesso!`);
            onCatalogCreated(newCatalog);
            setName('');
            setPurpose('general');
        } catch (error) {
            toast.error("Falha ao criar o catálogo.");
            console.error(error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Novo Catálogo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="catalog-name">Nome do Catálogo</Label>
                        <Input id="catalog-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Catálogo Principal, Universidade..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="catalog-purpose">Propósito</Label>
                        <Select value={purpose} onValueChange={setPurpose}>
                            <SelectTrigger id="catalog-purpose">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">Geral</SelectItem>
                                <SelectItem value="university">Universidade</SelectItem>
                                <SelectItem value="campaign_specific">Campanha Específica</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleCreate}>Criar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function CommandCenterPage() {
    const [catalogs, setCatalogs] = useState([]);
    const [selectedCatalog, setSelectedCatalog] = useState(null);
    const [allProjects, setAllProjects] = useState([]);
    const [allSalesPages, setAllSalesPages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadCatalogs = useCallback(async () => {
        const catalogsData = await Catalog.list();
        setCatalogs(catalogsData || []);
        if (catalogsData && catalogsData.length > 0) {
            setSelectedCatalog(catalogsData[0]);
        } else {
             const defaultCatalogSchema = await Catalog.schema();
             const defaultValues = Object.entries(defaultCatalogSchema.properties).reduce((acc, [key, prop]) => {
                acc[key] = prop.default;
                return acc;
            }, {});
             setSelectedCatalog({ name: "Novo Catálogo", ...defaultValues });
        }
        return catalogsData || [];
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await loadCatalogs();
                const [projectsData, salesPagesData] = await Promise.all([
                    FunnelProject.list(),
                    SalesPage.list()
                ]);
                setAllProjects(projectsData || []);
                setAllSalesPages(salesPagesData || []);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                toast.error("Falha ao carregar as configurações.");
            }
            setIsLoading(false);
        };
        loadData();
    }, [loadCatalogs]);

    const handleSettingsChange = (key, value) => {
        setSelectedCatalog(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!selectedCatalog) return;
        setIsSaving(true);
        try {
            const { id, created_date, updated_date, ...payload } = selectedCatalog;
            if (id) {
                await Catalog.update(id, payload);
            } else {
                const newCatalog = await Catalog.create(payload);
                await loadCatalogs();
                setSelectedCatalog(newCatalog);
            }
            toast.success(`Catálogo "${selectedCatalog.name}" salvo com sucesso!`);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Falha ao salvar as configurações.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDuplicate = async () => {
        if (!selectedCatalog || !selectedCatalog.id) return;
        const toastId = toast.loading("A duplicar catálogo...");
        try {
            const { id, created_date, updated_date, ...payload } = selectedCatalog;
            payload.name = `${selectedCatalog.name} (Cópia)`;
            
            const newCatalog = await Catalog.create(payload);
            toast.success(`Catálogo "${payload.name}" criado!`, { id: toastId });
            const updatedCatalogs = await loadCatalogs();
            const foundNew = updatedCatalogs.find(c => c.id === newCatalog.id);
            if(foundNew) setSelectedCatalog(foundNew);

        } catch (error) {
            toast.error("Falha ao duplicar o catálogo.", { id: toastId });
        }
    };

    const handleCatalogSelection = (catalogId) => {
        const catalog = catalogs.find(c => c.id === catalogId);
        if (catalog) {
            setSelectedCatalog(catalog);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="ml-4 text-gray-600">A carregar o seu centro de comando...</p>
            </div>
        );
    }
    
    const catalogPublicUrl = selectedCatalog?.id ? `${window.location.origin}${createPageUrl(`Catalogo?id=${selectedCatalog.id}`)}` : null;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Command Center: Editor de Catálogos</h1>
                    <p className="text-lg text-muted-foreground">Personalize as suas vitrines de cursos.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {catalogPublicUrl && 
                        <a href={catalogPublicUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline"><Eye className="mr-2 h-4 w-4" /> Ver Catálogo</Button>
                        </a>
                    }
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'A Guardar...' : 'Guardar Alterações'}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gestão de Catálogos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-center">
                    <Select onValueChange={handleCatalogSelection} value={selectedCatalog?.id || ''}>
                        <SelectTrigger className="flex-grow">
                            <SelectValue placeholder="Selecione um catálogo para editar..." />
                        </SelectTrigger>
                        <SelectContent>
                            {catalogs.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.purpose})</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Criar Novo</Button>
                        <Button variant="outline" onClick={handleDuplicate} disabled={!selectedCatalog?.id}><Copy className="mr-2 h-4 w-4"/> Duplicar</Button>
                    </div>
                </CardContent>
            </Card>

            {selectedCatalog && (
            <>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sparkles className="text-amber-500"/> Seção Hero</CardTitle>
                        <CardDescription>A primeira impressão do seu catálogo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={selectedCatalog.hero_type || 'video'} onValueChange={(v) => handleSettingsChange('hero_type', v)}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="video"><Film className="mr-2 h-4 w-4"/> Fundo com Vídeo</TabsTrigger>
                                <TabsTrigger value="image"><ImageIcon className="mr-2 h-4 w-4"/> Fundo com Imagem</TabsTrigger>
                            </TabsList>
                            <TabsContent value="video" className="pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hero_video_url">URL do Vídeo do YouTube</Label>
                                    <Input id="hero_video_url" value={selectedCatalog.hero_video_url || ''} onChange={e => handleSettingsChange('hero_video_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=..."/>
                                    <p className="text-xs text-muted-foreground">Cole o URL de um vídeo do YouTube para um fundo dinâmico.</p>
                                </div>
                            </TabsContent>
                            <TabsContent value="image" className="pt-4">
                                <ImageUploader label="Imagem de Fundo do Hero" value={selectedCatalog.hero_image_url || ''} onUploadComplete={url => handleSettingsChange('hero_image_url', url)} />
                            </TabsContent>
                        </Tabs>
                         <div className="grid md:grid-cols-2 gap-4 pt-6 mt-6 border-t">
                            <div className="space-y-2">
                                <Label htmlFor="hero_title">Título Principal</Label>
                                <Input id="hero_title" value={selectedCatalog.hero_title || ''} onChange={e => handleSettingsChange('hero_title', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hero_subtitle">Subtítulo</Label>
                                <Input id="hero_subtitle" value={selectedCatalog.hero_subtitle || ''} onChange={e => handleSettingsChange('hero_subtitle', e.target.value)} />
                            </div>
                        </div>
                         <div className="pt-6 mt-6 border-t">
                             <h3 className="text-md font-semibold mb-3 flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-gray-400"/> Botão de Ação (CTA)</h3>
                             <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hero_cta_text">Texto do Botão</Label>
                                    <Input id="hero_cta_text" value={selectedCatalog.hero_cta_text || ''} onChange={e => handleSettingsChange('hero_cta_text', e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Vídeo de Destino</Label>
                                     <Select value={selectedCatalog.hero_cta_url || ''} onValueChange={(v) => handleSettingsChange('hero_cta_url', v)}>
                                         <SelectTrigger>
                                             <SelectValue placeholder="Selecione um vídeo de uma aula..." />
                                         </SelectTrigger>
                                         <SelectContent>
                                             {allSalesPages.map(page => (
                                                 page.design_json?.lesson_videos?.filter(l => l.video_url).length > 0 && (
                                                    <SelectGroup key={page.id}>
                                                        <SelectLabel>{page.name}</SelectLabel>
                                                        {page.design_json.lesson_videos
                                                            .filter(lesson => lesson.video_url)
                                                            .map((lesson, index) => (
                                                            <SelectItem key={`${page.id}-${index}`} value={lesson.video_url}>
                                                                {`Aula ${index + 1}: ${lesson.title}`}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                 )
                                             ))}
                                         </SelectContent>
                                     </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="hero_cta_bg_color">Cor de Fundo do Botão</Label>
                                    <Input id="hero_cta_bg_color" type="color" value={selectedCatalog.hero_cta_bg_color || '#FFFFFF'} onChange={e => handleSettingsChange('hero_cta_bg_color', e.target.value)} className="h-10"/>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="hero_cta_text_color">Cor do Texto do Botão</Label>
                                    <Input id="hero_cta_text_color" type="color" value={selectedCatalog.hero_cta_text_color || '#000000'} onChange={e => handleSettingsChange('hero_cta_text_color', e.target.value)} className="h-10"/>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette /> Aparência e Tema</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="secondary_color">Cor de Fundo</Label>
                                <Input id="secondary_color" type="color" value={selectedCatalog.secondary_color || '#111827'} onChange={e => handleSettingsChange('secondary_color', e.target.value)} className="h-10"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="primary_color">Cor do Texto Principal</Label>
                                <Input id="primary_color" type="color" value={selectedCatalog.primary_color || '#FFFFFF'} onChange={e => handleSettingsChange('primary_color', e.target.value)} className="h-10"/>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Dock /> Conteúdo e Aparência</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="text-md font-semibold mb-2">Projetos Visíveis</h3>
                                    <ProjectSelector allProjects={allProjects} visibleIds={selectedCatalog.visible_project_ids || []} onSelectionChange={(ids) => handleSettingsChange('visible_project_ids', ids)} />
                                </div>

                                <div className="border-t pt-6">
                                    <h3 className="text-md font-semibold mb-2">Logo</h3>
                                     <div className="flex items-center space-x-2 mb-4">
                                        <Switch id="show_logo" checked={selectedCatalog.show_logo} onCheckedChange={c => handleSettingsChange('show_logo', c)} />
                                        <Label htmlFor="show_logo">Exibir logo no catálogo</Label>
                                    </div>
                                    {selectedCatalog.show_logo && (
                                        <div className="space-y-4">
                                            <ImageUploader label="Ficheiro do Logo" value={selectedCatalog.logo_url || ''} onUploadComplete={url => handleSettingsChange('logo_url', url)} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Tamanho</Label>
                                                    <Select value={selectedCatalog.logo_size || 'md'} onValueChange={v => handleSettingsChange('logo_size', v)}>
                                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                                        <SelectContent><SelectItem value="sm">Pequeno</SelectItem><SelectItem value="md">Médio</SelectItem><SelectItem value="lg">Grande</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                                 <div className="space-y-2">
                                                    <Label>Alinhamento</Label>
                                                    <Select value={selectedCatalog.logo_alignment || 'left'} onValueChange={v => handleSettingsChange('logo_alignment', v)}>
                                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                                        <SelectContent><SelectItem value="left">Esquerda</SelectItem><SelectItem value="center">Centro</SelectItem><SelectItem value="right">Direita</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Footprints /> Rodapé e Links</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="support_url">Link de Suporte (URL)</Label>
                            <Input id="support_url" value={selectedCatalog.support_url || ''} onChange={e => handleSettingsChange('support_url', e.target.value)} placeholder="https://seu-site.com/suporte"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="footer_text">Texto dos Direitos Reservados</Label>
                            <Textarea id="footer_text" value={selectedCatalog.footer_text || ''} onChange={e => handleSettingsChange('footer_text', e.target.value)} />
                        </div>
                     </CardContent>
                </Card>
            </>
            )}

            <CreateCatalogModal 
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                onCatalogCreated={(newCatalog) => {
                    loadCatalogs().then((all) => {
                        const found = all.find(c => c.id === newCatalog.id);
                        if (found) setSelectedCatalog(found);
                    });
                    setIsModalOpen(false);
                }}
            />
        </div>
    );
}
