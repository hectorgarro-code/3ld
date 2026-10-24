<?php
declare(strict_types=1);
namespace App\Services;

use PDO;

/** Registro compartido entre tienda y ERP. No ejecuta pagos, ajustes de stock ni anulaciones. */
final class ReturnLedger
{
    public function __construct(private PDO $db) {
        $suffix = $this->mysql() ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
        $db->exec('CREATE TABLE IF NOT EXISTS tienda_devoluciones (id VARCHAR(60) PRIMARY KEY, pedido_id INTEGER NULL, version INTEGER NOT NULL, datos ' . ($this->mysql() ? 'MEDIUMTEXT' : 'TEXT') . ' NOT NULL, actualizado VARCHAR(30) NOT NULL' . ($this->mysql() ? ', INDEX idx_devoluciones_pedido (pedido_id)' : '') . ')' . $suffix);
    }
    private function mysql(): bool { return $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private function text(array $body, string $key, int $max, bool $required = false): string {
        $value = $body[$key] ?? '';
        if (!is_string($value) || strlen($value) > $max || ($required && !trim($value))) throw new \InvalidArgumentException('Revisá el campo ' . $key . '.');
        return trim($value);
    }
    private function actor(array $user): array {
        if (empty($user['id'])) throw new \InvalidArgumentException('Usuario requerido.');
        return ['id'=>(int)$user['id'], 'nombre'=>(string)($user['nombre'] ?? 'Equipo 3LD')];
    }
    private function order(int $id, bool $lock = false): array {
        $sql = 'SELECT p.id, p.numero_pedido, p.total, c.telefono, c.email FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id WHERE p.id=?';
        $s = $this->db->prepare($sql . ($lock && $this->mysql() ? ' FOR UPDATE' : ''));
        $s->execute([$id]);
        $order = $s->fetch(PDO::FETCH_ASSOC);
        if (!$order) throw new \InvalidArgumentException('Pedido no encontrado.');
        return $order;
    }
    public function importLegacy(ReturnRequests $files): void {
        foreach ($files->all() as $entry) {
            $s=$this->db->prepare('SELECT id FROM tienda_devoluciones WHERE id=?'); $s->execute([$entry['id']]);
            if ($s->fetchColumn()) continue;
            $entry += ['tipo'=>'devolucion','pedido_id'=>null,'version'=>1,'historial'=>[]];
            $entry['actualizado']=$entry['fecha'];
            try { $this->insert($entry); }
            catch (\PDOException $e) { if (!in_array((string)$e->getCode(),['23000','23505'],true)) throw $e; }
        }
    }
    private function insert(array $entry): void {
        $s=$this->db->prepare('INSERT INTO tienda_devoluciones (id,pedido_id,version,datos,actualizado) VALUES (?,?,?,?,?)');
        $s->execute([$entry['id'],$entry['pedido_id'] ?? null,$entry['version'],json_encode($entry,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$entry['actualizado']]);
    }
    public function all(): array {
        return array_map(static fn($r)=>json_decode($r['datos'],true,512,JSON_THROW_ON_ERROR),$this->db->query('SELECT datos FROM tienda_devoluciones ORDER BY actualizado DESC, id DESC')->fetchAll(PDO::FETCH_ASSOC));
    }
    public function create(array $body, array $user): array {
        $type=$body['tipo'] ?? '';
        if (!in_array($type,['cambio','devolucion'],true)) throw new \InvalidArgumentException('Elegí cambio o devolución.');
        $id=filter_var($body['pedido_id'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        if (!$id) throw new \InvalidArgumentException('Seleccioná un pedido.');
        $order=$this->order($id);
        $note=$this->text($body,'observaciones',2000,true);
        $contact=$this->text($body,'contacto',200) ?: (string)($order['telefono'] ?: $order['email']);
        if (!$contact) throw new \InvalidArgumentException('Ingresá un contacto para el seguimiento.');
        $now=gmdate('c');
        $operation=$this->text($body,'operacion_id',80,true);
        if (!preg_match('/^[a-zA-Z0-9-]{16,80}$/D',$operation)) throw new \InvalidArgumentException('Identificador de operación inválido.');
        $caseId='3LD-DEV-M-'.strtoupper(substr(hash('sha256',$this->actor($user)['id'].'|'.$operation),0,24));
        $fingerprint=hash('sha256',json_encode([$id,$type,$note,$contact],JSON_THROW_ON_ERROR));
        $q=$this->db->prepare('SELECT datos FROM tienda_devoluciones WHERE id=?'); $q->execute([$caseId]);
        if ($previous=$q->fetchColumn()) { $previous=json_decode($previous,true,512,JSON_THROW_ON_ERROR); if (($previous['alta_huella'] ?? '')!==$fingerprint) throw new \DomainException('La operación de alta ya fue utilizada con otros datos.'); return $previous; }
        $entry=['id'=>$caseId,'alta_huella'=>$fingerprint, 'fecha'=>$now,'actualizado'=>$now,'pedido_id'=>$id,'pedido'=>$order['numero_pedido'],'contacto'=>$contact,'observaciones'=>$note,'tipo'=>$type,'estado'=>'pendiente','version'=>1,'historial'=>[['id'=>bin2hex(random_bytes(12)),'accion'=>'alta','fecha'=>$now,'usuario'=>$this->actor($user),'nota'=>$note]]];
        $this->insert($entry);
        return $entry;
    }
    public function movement(string $id, array $body, array $user): array {
        $actor=$this->actor($user);
        $action=$body['accion'] ?? '';
        if (!in_array($action,['nota','contacto','recibir','entregar_cambio','reintegro','cerrar','rechazar','vincular'],true)) throw new \InvalidArgumentException('Movimiento inválido.');
        $key=$this->text($body,'operacion_id',80,true);
        if (!preg_match('/^[a-zA-Z0-9-]{16,80}$/D',$key)) throw new \InvalidArgumentException('Identificador de operación inválido.');
        $note=$this->text($body,'nota',2000,true);
        $fingerprint=hash('sha256',json_encode([$action,$note,$body['importe'] ?? null,$body['medio'] ?? null,$body['referencia'] ?? null,$body['pedido_id'] ?? null,$actor['id']],JSON_THROW_ON_ERROR));
        $this->db->beginTransaction();
        try {
            $s=$this->db->prepare('SELECT datos,version FROM tienda_devoluciones WHERE id=?'.($this->mysql()?' FOR UPDATE':'')); $s->execute([$id]);
            $row=$s->fetch(PDO::FETCH_ASSOC);
            if (!$row) throw new \OutOfBoundsException('Solicitud no encontrada.');
            $entry=json_decode($row['datos'],true,512,JSON_THROW_ON_ERROR);
            foreach ($entry['historial'] as $event) {
                if ($event['id'] !== $key) continue;
                if (($event['huella'] ?? '') !== $fingerprint) throw new \DomainException('La operación ya fue utilizada con otros datos.');
                $this->db->commit(); return $entry;
            }
            if (($body['version'] ?? null) !== (int)$row['version']) throw new \DomainException('La ficha cambió. Actualizá antes de volver a guardar.');
            $closed=in_array($entry['estado'],['cerrado','rechazado'],true);
            if ($closed && $action!=='nota') throw new \InvalidArgumentException('La ficha está cerrada; solo podés agregar una nota.');
            $event=['id'=>$key,'accion'=>$action,'fecha'=>gmdate('c'),'usuario'=>$actor,'nota'=>$note,'huella'=>$fingerprint];
            if ($action==='contacto' && $entry['estado']==='pendiente') $entry['estado']='en_gestion';
            if ($action==='vincular') {
                if (!empty($entry['pedido_id'])) throw new \InvalidArgumentException('La ficha ya tiene un pedido vinculado.');
                $order=$this->order((int)($body['pedido_id'] ?? 0));
                $entry['pedido_id']=(int)$order['id']; $entry['pedido']=$order['numero_pedido'];
            }
            if ($action==='recibir') {
                if (!in_array($entry['estado'],['pendiente','en_gestion'],true)) throw new \InvalidArgumentException('La recepción ya fue registrada.');
                $entry['estado']='recibido'; $entry['fecha_recepcion']=$event['fecha'];
            }
            if ($action==='entregar_cambio') {
                if ($entry['tipo']!=='cambio' || !in_array($entry['estado'],['recibido','reintegro_registrado'],true)) throw new \InvalidArgumentException('Primero registrá la recepción de un cambio.');
                foreach ($entry['historial'] as $past) if ($past['accion']==='entregar_cambio') throw new \InvalidArgumentException('El cambio ya fue entregado.');
                $entry['estado']='cambio_entregado';
            }
            if ($action==='reintegro') {
                if (!in_array($entry['estado'],['recibido','reintegro_registrado','cambio_entregado'],true)) throw new \InvalidArgumentException('Primero registrá la recepción del producto.');
                if (empty($entry['pedido_id'])) throw new \InvalidArgumentException('Vinculá el pedido antes de registrar dinero.');
                $amount=$body['importe'] ?? '';
                if (!is_string($amount) || !preg_match('/^\d{1,9}(\.\d{1,2})?$/D',$amount) || (float)$amount<=0) throw new \InvalidArgumentException('Ingresá un importe positivo con hasta dos decimales.');
                $cents=(int)round((float)$amount*100);
                // Serializa también los reintegros registrados en otras fichas del mismo pedido.
                $order=$this->order((int)$entry['pedido_id'],true);
                $s=$this->db->prepare('SELECT datos FROM tienda_devoluciones WHERE pedido_id=?'); $s->execute([$entry['pedido_id']]);
                $refunded=0;
                foreach ($s->fetchAll(PDO::FETCH_ASSOC) as $case) foreach (json_decode($case['datos'],true,512,JSON_THROW_ON_ERROR)['historial'] as $past) if ($past['accion']==='reintegro') $refunded+=(int)$past['importe_centavos'];
                if ($refunded+$cents>(int)round((float)$order['total']*100)) throw new \InvalidArgumentException('Los reintegros registrados superarían el total del pedido.');
                $method=$body['medio'] ?? '';
                if (!in_array($method,['efectivo','transferencia','mercadopago','otro'],true)) throw new \InvalidArgumentException('Seleccioná el medio del reintegro.');
                $event += ['importe_centavos'=>$cents,'moneda'=>'ARS','medio'=>$method,'referencia'=>$this->text($body,'referencia',160,true)];
                $entry['estado']='reintegro_registrado';
            }
            if ($action==='rechazar') {
                if (!in_array($entry['estado'],['pendiente','en_gestion'],true)) throw new \InvalidArgumentException('Una ficha con recepción o dinero no se puede rechazar.');
                $entry['estado']='rechazado';
            }
            if ($action==='cerrar') {
                $actions=array_column($entry['historial'],'accion');
                $required=$entry['tipo']==='cambio'?'entregar_cambio':'reintegro';
                if (!in_array($required,$actions,true)) throw new \InvalidArgumentException('Antes de cerrar, registrá '.($required==='reintegro'?'el reintegro realizado.':'la entrega del cambio.'));
                $entry['estado']='cerrado';
            }
            $entry['historial'][]=$event; $entry['version']=(int)$row['version']+1; $entry['actualizado']=$event['fecha'];
            $s=$this->db->prepare('UPDATE tienda_devoluciones SET pedido_id=?,version=?,datos=?,actualizado=? WHERE id=? AND version=?');
            $s->execute([$entry['pedido_id'],$entry['version'],json_encode($entry,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$entry['actualizado'],$id,$row['version']]);
            if ($s->rowCount()!==1) throw new \DomainException('La ficha cambió. Actualizá antes de volver a guardar.');
            $this->db->commit(); return $entry;
        } catch (\Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
}
