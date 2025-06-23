import { supabase } from 'src/supabase/client';

export interface ReimbursementRequest {
    id: string;
    policy_id: string;
    client_id: string;
    request_date: string;
    status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'more_info_needed';
    amount_requested: number | null;
    amount_approved?: number | null;
    admin_notes?: string | null;
    rejection_reasons?: string[] | null;
    rejection_comments?: string | null;
}

export interface ReimbursementDocument {
    id: string;
    reimbursement_request_id: string;
    document_name: string;
    file_url: string;
    uploaded_at: string;
    status: 'pending_review' | 'approved' | 'rejected';
    admin_notes: string | null;
}

export interface RequiredDocument {
    id: string;
    product_id: string;
    document_name: string;
    is_required: boolean;
    description: string | null;
    sort_order: number;
}

export interface PolicyInfo {
    id: string;
    policy_number: string;
    product_id: string;
    product_name: string;
}

export interface ClientProfileInfo {
    full_name: string;
    numero_identificacion: string;
    email: string;
}

export interface ReimbursementRequestDetail extends ReimbursementRequest {
    policies: PolicyInfo | null;
    profiles: ClientProfileInfo | null;
}

export async function getAllReimbursementRequests() {
    const { data, error } = await supabase
        .from('reimbursement_requests')
        .select('*')
        .order('request_date', { ascending: false });
    return { data: data as ReimbursementRequest[] | null, error };
}

export async function getReimbursementRequestsByClientId(clientId: string) {
    const { data, error } = await supabase
        .from('reimbursement_requests')
        .select('*')
        .eq('client_id', clientId)
        .order('request_date', { ascending: false });
    
    return { data: data as ReimbursementRequest[] | null, error };
}

export async function getReimbursementRequestsByAgentId(agentId: string) {
    const { data, error } = await supabase
        .from('reimbursement_requests')
        .select('*, policies!inner(agent_id)')
        .eq('policies.agent_id', agentId)
        .order('request_date', { ascending: false });

    return { data: data as ReimbursementRequest[] | null, error };
}

export async function getActivePoliciesByClientId(clientId: string) {
    const { data, error } = await supabase
        .from('policies')
        .select(`id, policy_number, product_id, insurance_products ( name )`)
        .eq('client_id', clientId)
        .eq('status', 'active');

    if (error) return { data: null, error };

    const formattedData = data.map(p => ({
        id: p.id,
        policy_number: p.policy_number,
        product_id: p.product_id,
        // @ts-ignore
        product_name: p.insurance_products?.name || 'Producto Desconocido'
    }));
    
    return { data: formattedData as PolicyInfo[], error: null };
}

export async function getPolicyInfoById(policyId: string) {
    const { data, error } = await supabase
        .from('policies')
        .select(`id, policy_number, product_id, insurance_products ( name )`)
        .eq('id', policyId)
        .single();
    if (error) return { data: null, error };
    const policyInfo: PolicyInfo = {
        id: data.id,
        policy_number: data.policy_number,
        product_id: data.product_id,
        // @ts-ignore
        product_name: data.insurance_products?.name || 'Producto no encontrado'
    };
    return { data: policyInfo, error: null };
}

export async function getClientProfileById(clientId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, numero_identificacion, email')
        .eq('user_id', clientId)
        .single();
    return { data: data as ClientProfileInfo | null, error };
}

export async function getReimbursementRequestById(id: string) {
    const { data, error } = await supabase
        .from('reimbursement_requests')
        .select(`
            *,
            policies!reimbursement_requests_policy_id_fkey (
                *,
                insurance_products!policies_product_id_fkey ( * )
            ),
            profiles!reimbursement_requests_client_id_fkey ( * )
        `)
        .eq('id', id)
        .single();
    
    // El casting a 'any' sigue siendo útil aquí
    return { data: data as any as ReimbursementRequestDetail | null, error };
}

export async function getSubmittedDocuments(requestId: string) {
    const { data, error } = await supabase
        .from('reimbursement_documents')
        .select('*')
        .eq('reimbursement_request_id', requestId)
        .order('uploaded_at', { ascending: false });

    if (error) return { data: null, error };
    
    const documentsWithUrls = await Promise.all(
        (data || []).map(async (doc) => {
            const { data: urlData } = supabase.storage.from('reimbursement-docs').getPublicUrl(doc.file_url);
            return { ...doc, file_url: urlData?.publicUrl || '#' };
        })
    );
    return { data: documentsWithUrls as ReimbursementDocument[], error: null };
}

export async function updateReimbursementRequest(id: string, updates: Partial<ReimbursementRequest>) {
    const { data, error } = await supabase
        .from('reimbursement_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data: data as ReimbursementRequest, error };
}

export async function createReimbursementRequest(
    requestData: Omit<ReimbursementRequest, 'id' | 'request_date' | 'status'>,
    filesToUpload: Map<string, File>,
    userId: string
) {
    const { data: newRequest, error: requestError } = await supabase
        .from('reimbursement_requests')
        .insert({
            ...requestData,
            status: 'pending'
        })
        .select()
        .single();

    if (requestError) throw new Error(`Error al crear la solicitud: ${requestError.message}`);
    if (!newRequest) throw new Error('No se pudo obtener la solicitud recién creada.');

    const uploadedDocuments: { document_name: string; file_url: string; reimbursement_request_id: string, uploaded_by: string }[] = [];
    for (const [docName, file] of filesToUpload.entries()) {
        const filePath = `reimbursement-docs/${newRequest.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
            .from('reimbursement-docs')
            .upload(filePath, file);

        if (uploadError) {
            await supabase.from('reimbursement_requests').delete().eq('id', newRequest.id);
            throw new Error(`Error al subir el archivo ${file.name}. La solicitud ha sido cancelada.`);
        }
        uploadedDocuments.push({
            reimbursement_request_id: newRequest.id,
            document_name: docName,
            file_url: filePath,
            uploaded_by: userId
        });
    }
    
    if (uploadedDocuments.length > 0) {
        const { error: docsError } = await supabase
            .from('reimbursement_documents')
            .insert(uploadedDocuments);
        if (docsError) {
            throw new Error(`Error al registrar los documentos: ${docsError.message}`);
        }
    }

    return { data: newRequest, error: null };
}

export async function getRequiredDocuments(productId: string) {
    const { data, error } = await supabase
        .from('reimbursement_required_documents')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });
    return { data: data as RequiredDocument[], error };
}

export async function createRequiredDocument(docData: Omit<RequiredDocument, 'id'>) {
    const { data, error } = await supabase
        .from('reimbursement_required_documents')
        .insert(docData)
        .select()
        .single();
    return { data, error };
}

export async function updateRequiredDocument(id: string, updates: Partial<Omit<RequiredDocument, 'id' | 'product_id'>>) {
    const { data, error } = await supabase
        .from('reimbursement_required_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

export async function deleteRequiredDocument(id: string) {
    const { error } = await supabase
        .from('reimbursement_required_documents')
        .delete()
        .eq('id', id);
    return { error };
}

export async function deleteReimbursementDocument(docId: string, filePath: string) {
    // 1. Primero, elimina el archivo del Storage
    const { error: storageError } = await supabase.storage
        .from('reimbursement-docs')
        .remove([filePath]);

    if (storageError) {
        // Si falla la eliminación del storage, es mejor no continuar para evitar inconsistencias.
        throw new Error(`Error al eliminar el archivo del almacenamiento: ${storageError.message}`);
    }

    // 2. Si el paso 1 fue exitoso, elimina el registro de la base de datos
    const { error: dbError } = await supabase
        .from('reimbursement_documents')
        .delete()
        .eq('id', docId);
    
    if (dbError) {
        // Esto es poco probable si el paso 1 funcionó, pero es una buena práctica manejarlo.
        throw new Error(`Error al eliminar el registro del documento: ${dbError.message}`);
    }

    return { success: true };
}

export async function updateReimbursementWithDocs(
    requestId: string,
    updates: Partial<ReimbursementRequest>,
    filesToAdd: Map<string, File>,
    docsToDelete: { id: string, file_url: string }[],
    userId: string
) {
    // 1. Eliminar documentos marcados para borrado
    for (const doc of docsToDelete) {
        await supabase.storage.from('reimbursement-docs').remove([doc.file_url]);
        await supabase.from('reimbursement_documents').delete().eq('id', doc.id);
    }

    // 2. Subir nuevos documentos
    const newDocsData = [];
    for (const [docName, file] of filesToAdd.entries()) {
        const filePath = `reimbursement-docs/${requestId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const { error } = await supabase.storage.from('reimbursement-docs').upload(filePath, file);
        if (error) throw new Error(`Error subiendo ${docName}: ${error.message}`);
        newDocsData.push({
            reimbursement_request_id: requestId,
            document_name: docName,
            file_url: filePath,
            uploaded_by: userId
        });
    }

    // 3. Insertar registros de nuevos documentos
    if (newDocsData.length > 0) {
        await supabase.from('reimbursement_documents').insert(newDocsData);
    }

    // 4. Actualizar la solicitud principal (ej. cambiar estado a 'pending' de nuevo)
    const { data, error } = await supabase
        .from('reimbursement_requests')
        .update({ ...updates, status: 'pending', rejection_reasons: null, rejection_comments: null })
        .eq('id', requestId)
        .select()
        .single();
    
    if (error) throw error;
    return { data };
}